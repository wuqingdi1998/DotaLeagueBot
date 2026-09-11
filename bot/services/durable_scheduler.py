from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Protocol

import asyncpg


SCHEDULER_NOTIFICATION_CHANNEL = "bot_scheduled_events"
JOB_FAILURE_RETRY_SECONDS = 30
MAX_CONNECTION_RETRY_SECONDS = 30


class ScheduledEventJob(Protocol):
    name: str

    async def process_due(self) -> None: ...

    async def next_due_at(self) -> datetime | None: ...


ConnectionFactory = Callable[[], Awaitable[asyncpg.Connection]]


@dataclass
class JobRuntimeState:
    retry_at: datetime | None = None


def register_scheduled_job(bot: object, job: ScheduledEventJob) -> None:
    jobs = getattr(bot, "scheduled_event_jobs", None)
    if not isinstance(jobs, list):
        raise RuntimeError("The bot scheduler registry is not initialized")
    jobs.append(job)


async def open_scheduler_connection() -> asyncpg.Connection:
    from database.core import DATABASE_URL

    return await asyncpg.connect(
        user=DATABASE_URL.username,
        password=DATABASE_URL.password,
        database=DATABASE_URL.database,
        host=DATABASE_URL.host,
        port=DATABASE_URL.port,
        server_settings={"application_name": "dota_league_bot_scheduler"},
    )


def seconds_until(due_at: datetime | None) -> float | None:
    if due_at is None:
        return None
    return max(0.0, (due_at - datetime.now(timezone.utc)).total_seconds())


async def wait_until_due_or_notified(
    wakeup: asyncio.Event,
    due_at: datetime | None,
    disconnected: asyncio.Event | None = None,
) -> None:
    timeout = seconds_until(due_at)
    if timeout == 0:
        return

    wakeup_waiter = asyncio.create_task(wakeup.wait())
    waiters = {wakeup_waiter}
    disconnected_waiter: asyncio.Task[bool] | None = None
    if disconnected is not None:
        disconnected_waiter = asyncio.create_task(disconnected.wait())
        waiters.add(disconnected_waiter)

    try:
        await asyncio.wait(
            waiters,
            timeout=timeout,
            return_when=asyncio.FIRST_COMPLETED,
        )
    finally:
        for waiter in waiters:
            if not waiter.done():
                waiter.cancel()
        await asyncio.gather(*waiters, return_exceptions=True)

    if disconnected is not None and disconnected.is_set():
        raise ConnectionError("PostgreSQL scheduler connection was closed")


class DurableScheduler:
    """Runs persisted jobs at their next deadline and wakes on database changes."""

    def __init__(
        self,
        jobs: Sequence[ScheduledEventJob],
        connection_factory: ConnectionFactory = open_scheduler_connection,
    ) -> None:
        self.jobs = tuple(jobs)
        self.connection_factory = connection_factory
        self.wakeup = asyncio.Event()
        self.runtime = {job.name: JobRuntimeState() for job in self.jobs}
        if len(self.runtime) != len(self.jobs):
            raise ValueError("Scheduled job names must be unique")

    def notify(self, *_args: object) -> None:
        self.wakeup.set()

    async def run(self) -> None:
        connection_retry_seconds = 1
        while True:
            connection: asyncpg.Connection | None = None
            try:
                connection = await self.connection_factory()
                disconnected = asyncio.Event()
                connection.add_termination_listener(
                    lambda _connection: disconnected.set()
                )
                await connection.add_listener(
                    SCHEDULER_NOTIFICATION_CHANNEL,
                    self.notify,
                )
                print("[SCHEDULER] Connected to PostgreSQL event notifications.")
                connection_retry_seconds = 1
                self.wakeup.set()
                await self._run_connected(disconnected)
            except asyncio.CancelledError:
                raise
            except (OSError, ConnectionError, asyncpg.PostgresError) as error:
                print(
                    "[SCHEDULER] Database notification connection failed; "
                    f"retrying in {connection_retry_seconds}s: {error}"
                )
            finally:
                if connection is not None and not connection.is_closed():
                    await connection.close()

            await asyncio.sleep(connection_retry_seconds)
            connection_retry_seconds = min(
                connection_retry_seconds * 2,
                MAX_CONNECTION_RETRY_SECONDS,
            )

    async def _run_connected(self, disconnected: asyncio.Event) -> None:
        while not disconnected.is_set():
            self.wakeup.clear()
            await self._process_jobs()
            next_due_at = await self._next_due_at()
            if self.wakeup.is_set():
                continue
            await wait_until_due_or_notified(
                self.wakeup,
                next_due_at,
                disconnected,
            )

    async def _process_jobs(self) -> None:
        now = datetime.now(timezone.utc)
        await asyncio.gather(
            *(self._process_job(job, now) for job in self.jobs)
        )

    async def _process_job(
        self,
        job: ScheduledEventJob,
        now: datetime,
    ) -> None:
        state = self.runtime[job.name]
        if state.retry_at is not None and state.retry_at > now:
            return
        try:
            await job.process_due()
        except asyncio.CancelledError:
            raise
        except Exception as error:
            state.retry_at = now + timedelta(seconds=JOB_FAILURE_RETRY_SECONDS)
            print(
                f"[SCHEDULER] Job {job.name} failed; retrying at "
                f"{state.retry_at.isoformat()}: {error}"
            )
        else:
            state.retry_at = None

    async def _next_due_at(self) -> datetime | None:
        now = datetime.now(timezone.utc)
        due_times = await asyncio.gather(
            *(self._next_job_due_at(job, now) for job in self.jobs)
        )
        known_due_times = [due_at for due_at in due_times if due_at is not None]
        return min(known_due_times, default=None)

    async def _next_job_due_at(
        self,
        job: ScheduledEventJob,
        now: datetime,
    ) -> datetime | None:
        state = self.runtime[job.name]
        try:
            due_at = await job.next_due_at()
        except asyncio.CancelledError:
            raise
        except Exception as error:
            state.retry_at = state.retry_at or now + timedelta(
                seconds=JOB_FAILURE_RETRY_SECONDS
            )
            print(
                f"[SCHEDULER] Could not read next deadline for "
                f"{job.name}: {error}"
            )
            due_at = None
        if state.retry_at is not None:
            return max(due_at, state.retry_at) if due_at else state.retry_at
        return due_at
