from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from services.season_lobby_notifications import (
    SeasonLobbyNotification,
    send_season_lobby_notification,
)


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0132_season_lobby_start_notifications.sql"
).read_text(encoding="utf-8")


class FakeRecipient:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send(self, **message: object) -> object:
        self.messages.append(message)
        return SimpleNamespace(id=987654321)


class FakeBot:
    def __init__(self, recipient: FakeRecipient) -> None:
        self.recipient = recipient

    def get_user(self, user_id: int) -> FakeRecipient | None:
        return self.recipient if user_id == 123 else None

    async def fetch_user(self, user_id: int) -> FakeRecipient:
        assert user_id == 123
        return self.recipient


@pytest.mark.asyncio
async def test_lobby_notification_sends_private_embed_without_mentions() -> None:
    recipient = FakeRecipient()
    notification = SeasonLobbyNotification(
        id=1,
        discord_id=123,
        title="Матч начинается!",
        message="Название: **Нижнее лобби**\nПароль: **4827**",
        attempts=0,
    )

    message_id = await send_season_lobby_notification(
        FakeBot(recipient),
        notification,
    )

    assert message_id == 987654321
    embed = recipient.messages[0]["embed"]
    assert embed.title == "Матч начинается!"
    assert embed.description == notification.message
    allowed_mentions = recipient.messages[0]["allowed_mentions"]
    assert allowed_mentions.everyone is False
    assert allowed_mentions.users is False
    assert allowed_mentions.roles is False


def test_lobby_schedule_uses_one_password_and_requested_delivery_times() -> None:
    assert "dota_lobby_password ~ '^[0-9]{4}$'" in MIGRATION
    assert "LPAD(" in MIGRATION
    assert "lobby.scheduled_at - INTERVAL '5 minutes'" in MIGRATION
    assert "ELSE lobby.scheduled_at" in MIGRATION
    assert "Матч скоро начнется! Вы – хост лобби" in MIGRATION
    assert "Матч начинается!" in MIGRATION
    assert "Не изменяйте название и пароль –" in MIGRATION
    assert "подождите немного – хост создаёт его" in MIGRATION
    assert "|| '/season-lobby/' || match.id" in MIGRATION
    assert "UNIQUE (match_id, discord_id, audience)" in MIGRATION
