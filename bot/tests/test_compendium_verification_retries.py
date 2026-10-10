from datetime import date
from unittest.mock import AsyncMock, MagicMock

import discord
import pytest

from services import compendium_verification_retries as service


def exhausted_request():
    return {"id": 45, "player_id": 100, "player_name": "Player @everyone",
            "snapshot": {"title": "Испытание Рун"}, "moscow_date": date(2026, 10, 11),
            "attempts": 11, "last_error": "OpenDota unavailable"}


class Session:
    def __init__(self, rows):
        self.rows = iter(rows)
        self.statements = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    def begin(self):
        return self

    async def execute(self, statement, values=None):
        sql = str(statement)
        self.statements.append((sql, values))
        result = MagicMock()
        if "SELECT request.*" in sql:
            result.mappings.return_value.first.return_value = next(self.rows, None)
        return result


def bot_mock():
    bot = MagicMock()
    bot.get_user.return_value.dm_channel.id = 500
    bot.http.send_message = AsyncMock(return_value={"id": "900"})
    bot.http.delete_message = AsyncMock()
    return bot


def test_final_report_contains_player_original_date_task_and_review_link():
    message = service.exhausted_verification_message(exhausted_request())
    assert "Player" in message and "2026-10-11 (МСК)" in message
    assert "Испытание Рун" in message and "Автоматические повторы завершены" in message
    assert "/compendium/base" in message and "11" in message


@pytest.mark.asyncio
async def test_sends_only_exhausted_requests_once_with_stable_discord_nonce(monkeypatch):
    session = Session([exhausted_request(), None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    await service.deliver_verification_notifications(bot)
    bot.get_user.assert_not_called()
    bot.http.send_message.assert_awaited_once()
    assert bot.http.send_message.call_args.args[0] == service.COMPENDIUM_REVIEW_CHANNEL_ID
    payload = bot.http.send_message.call_args.kwargs["params"].payload
    assert payload["nonce"] == "cv-45" and payload["enforce_nonce"] is True
    assert payload["allowed_mentions"]["parse"] == []
    select_sql = session.statements[0][0]
    assert "status = 'exhausted'" in select_sql and "notified_at IS NULL" in select_sql
    assert "FOR UPDATE OF request SKIP LOCKED" in select_sql
    assert any("notified_at = NOW()" in sql and values["message_id"] == 900 for sql, values in session.statements if values)
    assert any(values.get("channel_id") == service.COMPENDIUM_REVIEW_CHANNEL_ID for _, values in session.statements if values)


@pytest.mark.asyncio
async def test_discord_failure_retries_only_delivery_not_the_result_check(monkeypatch):
    session = Session([exhausted_request(), None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    bot.http.send_message.side_effect = discord.Forbidden(MagicMock(status=403, reason="Forbidden"), "DM closed")
    await service.deliver_verification_notifications(bot)
    updates = [sql for sql, _values in session.statements if sql.startswith("UPDATE")]
    assert len(updates) == 1 and "notification_retry_at" in updates[0]
    assert "next_attempt_at" not in updates[0] and "status =" not in updates[0]


@pytest.mark.asyncio
async def test_no_notifications_for_pending_completed_or_already_notified(monkeypatch):
    session = Session([None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    await service.deliver_verification_notifications(bot)
    bot.http.send_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_notifications_still_get_processed_if_site_unavailable(monkeypatch):
    delivered = AsyncMock()
    monkeypatch.setattr(service, "deliver_verification_notifications", delivered)
    cleanup = AsyncMock()
    monkeypatch.setattr(service, "remove_resolved_verification_notifications", cleanup)
    monkeypatch.setattr(service, "request_due_verifications", AsyncMock(side_effect=RuntimeError("Site unavailable")))
    monkeypatch.setattr(service, "has_due_verifications", AsyncMock(return_value=True))
    bot = bot_mock()
    with pytest.raises(RuntimeError):
        await service.process_verification_retries(bot)
    delivered.assert_awaited_once_with(bot)
    assert cleanup.await_count == 2


@pytest.mark.asyncio
async def test_other_scheduler_events_do_not_trigger_early_or_empty_site_checks(monkeypatch):
    monkeypatch.setattr(service, "deliver_verification_notifications", AsyncMock())
    monkeypatch.setattr(service, "remove_resolved_verification_notifications", AsyncMock())
    monkeypatch.setattr(service, "has_due_verifications", AsyncMock(return_value=False))
    request = AsyncMock()
    monkeypatch.setattr(service, "request_due_verifications", request)
    await service.process_verification_retries(bot_mock())
    request.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("channel_id", [service.COMPENDIUM_REVIEW_CHANNEL_ID, 600, None])
@pytest.mark.parametrize("status", ["completed", "cancelled"])
async def test_resolved_notifications_are_deleted_by_saved_id_including_older_messages(monkeypatch, channel_id, status):
    session = Session([{**exhausted_request(), "status": status, "discord_message_id": 900, "discord_channel_id": channel_id}, None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    await service.remove_resolved_verification_notifications(bot)
    bot.http.delete_message.assert_awaited_once_with(channel_id or 500, 900)
    bot.http.send_message.assert_not_awaited()
    sql = session.statements[0][0]
    assert "status IN ('completed', 'cancelled')" in sql and "discord_message_id IS NOT NULL" in sql
    assert "notification_deleted_at IS NULL" in sql and "FOR UPDATE SKIP LOCKED" in sql
    assert any("notification_deleted_at = NOW()" in statement for statement, _ in session.statements)


@pytest.mark.asyncio
async def test_already_deleted_message_is_treated_as_success(monkeypatch):
    session = Session([{**exhausted_request(), "discord_message_id": 900, "discord_channel_id": 500}, None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    bot.http.delete_message.side_effect = discord.NotFound(MagicMock(status=404, reason="Not Found"), {"code": 10008, "message": "Unknown Message"})
    await service.remove_resolved_verification_notifications(bot)
    assert any("notification_deleted_at = NOW()" in sql for sql, _ in session.statements)
    assert not any("notification_delete_retry_at =" in sql for sql, _ in session.statements)


@pytest.mark.asyncio
@pytest.mark.parametrize("error", [
    discord.Forbidden(MagicMock(status=403, reason="Forbidden"), "No access"),
    discord.NotFound(MagicMock(status=404, reason="Not Found"), {"code": 10003, "message": "Unknown Channel"}),
    TimeoutError(),
])
async def test_cleanup_failure_retries_only_deletion_and_preserves_awarded_result(monkeypatch, error):
    session = Session([{**exhausted_request(), "discord_message_id": 900, "discord_channel_id": 500}, None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    bot.http.delete_message.side_effect = error
    await service.remove_resolved_verification_notifications(bot)
    updates = [sql for sql, _ in session.statements if sql.startswith("UPDATE")]
    assert len(updates) == 1 and "notification_delete_retry_at" in updates[0]
    assert "notification_deleted_at =" not in updates[0]
    assert "next_attempt_at" not in updates[0] and "status =" not in updates[0]
    bot.http.send_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_cleanup_does_not_touch_unresolved_requests(monkeypatch):
    session = Session([None])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    bot = bot_mock()
    await service.remove_resolved_verification_notifications(bot)
    bot.http.delete_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_scheduler_includes_persisted_message_cleanup_after_completion_or_cancellation(monkeypatch):
    session = Session([])
    monkeypatch.setattr(service, "verification_session", lambda: session)
    await service.next_verification_due_at()
    sql = session.statements[0][0]
    assert "notification_delete_retry_at" in sql and "status IN ('completed', 'cancelled')" in sql
    assert "discord_message_id IS NOT NULL" in sql and "notification_deleted_at IS NULL" in sql
