from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import discord
import pytest

from services import season_round_discord_channel as channel_service
from services.season_round_discord_channel import (
    SeasonRoundDiscordChannelTarget,
    build_private_round_overwrites,
    delete_season_round_discord_channel,
    ensure_season_round_discord_channel,
    season_round_channel_expires_at,
    season_round_channel_name,
    season_round_channel_topic,
)


ROOT = Path(__file__).parents[1]
MIGRATION = (
    ROOT / "database" / "migrations" / "0090_season_round_discord_channels.sql"
).read_text(encoding="utf-8")
MEMBERSHIP_MIGRATION = (
    ROOT
    / "database"
    / "migrations"
    / "0091_season_round_discord_channel_members.sql"
).read_text(encoding="utf-8")
BRIDGE = (ROOT / "cogs" / "website_bridge.py").read_text(encoding="utf-8")
SYNC = (
    ROOT / "services" / "season_round_channel_sync.py"
).read_text(encoding="utf-8")


def test_round_channel_name_keeps_the_round_name_and_discord_limits() -> None:
    assert (
        season_round_channel_name("Тур 1: Шведская система!", 1)
        == "тур-1-шведская-система"
    )
    assert season_round_channel_name(None, 12) == "тур-12"
    assert len(season_round_channel_name("Очень длинный " * 20, 2)) <= 100


def test_round_channel_topic_has_a_stable_round_marker() -> None:
    assert season_round_channel_topic(42).endswith("season-round:42")


def test_round_channel_expires_exactly_three_hours_after_start() -> None:
    scheduled_at = datetime(2026, 8, 25, 19, 0, tzinfo=UTC)
    assert season_round_channel_expires_at(scheduled_at) == scheduled_at + timedelta(
        hours=3
    )


def test_private_overwrites_hide_the_channel_and_admit_participants() -> None:
    default_role = object()
    organizer_role = object()
    participant = object()
    base_overwrites = {
        default_role: discord.PermissionOverwrite(view_channel=True),
        organizer_role: discord.PermissionOverwrite(
            view_channel=True, manage_channels=True
        ),
    }

    overwrites = build_private_round_overwrites(
        base_overwrites, default_role, [participant]
    )

    assert overwrites[default_role].view_channel is False
    assert overwrites[organizer_role].manage_channels is True
    assert overwrites[participant].view_channel is True
    assert overwrites[participant].send_messages is True
    assert overwrites[participant].read_message_history is True


def test_round_channel_id_is_persistent_and_bridge_manages_lifecycle() -> None:
    assert "discord_channel_id BIGINT" in MIGRATION
    assert "season_round_discord_channel_members" in MEMBERSHIP_MIGRATION
    assert "PRIMARY KEY (round_id, player_id)" in MEMBERSHIP_MIGRATION
    assert "sync_season_round_discord_channels(self.bot, session)" in BRIDGE
    assert "INTERVAL '3 hours'" in SYNC
    assert "season_round_status_at(scheduled_at, status)" in SYNC
    assert "ensure_season_round_discord_channel" in SYNC
    assert "delete_season_round_discord_channel" in SYNC
    assert "season_round_discord_channel_members" in SYNC


@pytest.mark.asyncio
async def test_first_registration_creates_one_private_round_channel(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    default_role = discord.Object(id=1)
    participant = discord.Object(id=2)
    created: dict[str, object] = {}

    class FakeGuild:
        def __init__(self) -> None:
            self.default_role = default_role

        async def create_text_channel(self, name: str, **options: object):
            created.update(name=name, **options)
            return SimpleNamespace(id=99)

    category = SimpleNamespace(
        guild=FakeGuild(),
        overwrites={default_role: discord.PermissionOverwrite(view_channel=True)},
        text_channels=[],
    )
    target = SeasonRoundDiscordChannelTarget(
        round_id=42,
        round_number=1,
        round_name="Тестовый тур",
        scheduled_at=datetime(2026, 8, 25, 19, 0, tzinfo=UTC),
        discord_channel_id=None,
        participant_ids=(2,),
        managed_participant_ids=(),
    )

    async def registered_members(
        _guild: object, participant_ids: tuple[int, ...]
    ) -> list[discord.Object]:
        return [participant] if participant_ids == (2,) else []

    async def missing_channel(*_args: object) -> None:
        return None

    monkeypatch.setattr(channel_service, "_registered_members", registered_members)
    monkeypatch.setattr(channel_service, "_text_channel", missing_channel)

    channel = await ensure_season_round_discord_channel(category, target)

    assert channel.id == 99
    assert created["name"] == "тестовый-тур"
    assert created["topic"] == season_round_channel_topic(42)
    overwrites = created["overwrites"]
    assert isinstance(overwrites, dict)
    assert overwrites[default_role].view_channel is False
    assert overwrites[participant].view_channel is True


@pytest.mark.asyncio
async def test_later_registration_gets_access_without_a_second_channel(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    participant = discord.Object(id=3)
    granted: list[object] = []

    class ExistingChannel:
        id = 99

        def overwrites_for(self, _member: object) -> discord.PermissionOverwrite:
            return discord.PermissionOverwrite()

        async def set_permissions(self, member: object, **_options: object) -> None:
            granted.append(member)

    async def registered_members(
        _guild: object, participant_ids: tuple[int, ...]
    ) -> list[discord.Object]:
        return [participant] if participant_ids == (3,) else []

    async def existing_channel(*_args: object) -> ExistingChannel:
        return ExistingChannel()

    monkeypatch.setattr(channel_service, "_registered_members", registered_members)
    monkeypatch.setattr(channel_service, "_text_channel", existing_channel)
    category = SimpleNamespace(guild=object(), text_channels=[], overwrites={})
    target = SeasonRoundDiscordChannelTarget(
        round_id=42,
        round_number=1,
        round_name="Тестовый тур",
        scheduled_at=datetime(2026, 8, 25, 19, 0, tzinfo=UTC),
        discord_channel_id=99,
        participant_ids=(3,),
        managed_participant_ids=(),
    )

    channel = await ensure_season_round_discord_channel(category, target)

    assert channel.id == 99
    assert granted == [participant]


@pytest.mark.asyncio
async def test_removed_registration_loses_only_bot_managed_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    removed_participant = discord.Object(id=3)
    permission_changes: list[tuple[object, object]] = []

    class ExistingChannel:
        id = 99

        def overwrites_for(self, _member: object) -> discord.PermissionOverwrite:
            return discord.PermissionOverwrite(view_channel=True)

        async def set_permissions(self, member: object, **options: object) -> None:
            permission_changes.append((member, options["overwrite"]))

    async def registered_members(
        _guild: object, participant_ids: tuple[int, ...]
    ) -> list[discord.Object]:
        return [removed_participant] if participant_ids == (3,) else []

    async def existing_channel(*_args: object) -> ExistingChannel:
        return ExistingChannel()

    monkeypatch.setattr(channel_service, "_registered_members", registered_members)
    monkeypatch.setattr(channel_service, "_text_channel", existing_channel)
    category = SimpleNamespace(guild=object(), text_channels=[], overwrites={})
    target = SeasonRoundDiscordChannelTarget(
        round_id=42,
        round_number=1,
        round_name="Тестовый тур",
        scheduled_at=datetime(2026, 8, 25, 19, 0, tzinfo=UTC),
        discord_channel_id=99,
        participant_ids=(),
        managed_participant_ids=(3,),
    )

    await ensure_season_round_discord_channel(category, target)

    assert permission_changes == [(removed_participant, None)]


@pytest.mark.asyncio
async def test_expired_round_channel_is_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    deleted = False

    class ExistingChannel:
        async def delete(self, **_options: object) -> None:
            nonlocal deleted
            deleted = True

    async def existing_channel(*_args: object) -> ExistingChannel:
        return ExistingChannel()

    monkeypatch.setattr(channel_service, "_text_channel", existing_channel)

    await delete_season_round_discord_channel(object(), 99)

    assert deleted is True
