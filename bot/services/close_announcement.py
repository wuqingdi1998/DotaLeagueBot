from datetime import datetime, timedelta, timezone
from typing import Protocol


MSK = timezone(timedelta(hours=3))


class CloseEventData(Protocol):
    start_ts: int
    game_format: str
    series: str
    host_id: int
    participant_ids: str
    participant_joined_at: str


def participant_entries(
    event: CloseEventData,
) -> list[tuple[str, int | None]]:
    """Return registrations in click order, including legacy rows without time."""
    joined_at: dict[str, int] = {}
    for item in (event.participant_joined_at or "").split(","):
        participant_id, separator, timestamp = item.partition(":")
        if separator and participant_id.isdigit() and timestamp.isdigit():
            joined_at[participant_id] = int(timestamp)
    return [
        (participant_id, joined_at.get(participant_id))
        for participant_id in event.participant_ids.split(",")
        if participant_id
    ]


def set_participant_entries(
    event: CloseEventData,
    participants: list[tuple[str, int | None]],
) -> None:
    event.participant_ids = ",".join(
        participant_id for participant_id, _ in participants
    )
    event.participant_joined_at = ",".join(
        f"{participant_id}:{joined_at}"
        for participant_id, joined_at in participants
        if joined_at is not None
    )


def build_content(
    event: CloseEventData,
    participants: list[tuple[str, int | None]],
) -> str:
    """Render the close announcement for the first post and every edit."""
    people = (
        ", ".join(
            (
                f"<@{participant_id}> "
                f"({datetime.fromtimestamp(joined_at, tz=MSK):%H:%M})"
                if joined_at is not None
                else f"<@{participant_id}>"
            )
            for participant_id, joined_at in participants
        )
        if participants
        else "Пока нет участников"
    )
    start_msk = datetime.fromtimestamp(event.start_ts, tz=MSK)
    return (
        "@everyone\n"
        "📢 Открыта регистрация на клоз!\n"
        f"В {start_msk:%H:%M} "
        f"(локальное время — <t:{event.start_ts}:t>) "
        f"<t:{event.start_ts}:D> на сервере состоится клоз-матч\n"
        f"Формат: {event.game_format}, Best of {event.series} "
        f"(Хост — <@{event.host_id}>)\n"
        "Для регистрации на ивент нужно поставить реакцию ✅ "
        "на это сообщение\n"
        "Для отказа от участия после регистрации нужно написать хосту\n\n"
        "Участники:\n"
        f"{people}"
    )
