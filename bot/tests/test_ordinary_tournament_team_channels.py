from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import discord
import pytest


ROOT = Path(__file__).parents[1]
MIGRATION = (
    ROOT
    / "database"
    / "migrations"
    / "0137_ordinary_tournament_team_channels.sql"
).read_text(encoding="utf-8")
COG = (ROOT / "cogs" / "ordinary_tournament_team_channels.py").read_text(
    encoding="utf-8"
)


def test_private_voice_overwrites_admit_only_team_members() -> None:
    from services.ordinary_tournament_team_channels import (
        build_private_voice_overwrites,
    )

    everyone = discord.Object(id=1)
    first_member = discord.Object(id=2)
    second_member = discord.Object(id=3)

    overwrites = build_private_voice_overwrites(
        everyone,
        (first_member, second_member),
    )

    assert set(overwrites) == {everyone, first_member, second_member}
    assert overwrites[everyone].view_channel is False
    assert overwrites[everyone].connect is False
    for member in (first_member, second_member):
        assert overwrites[member].view_channel is True
        assert overwrites[member].connect is True
        assert overwrites[member].speak is True


def test_team_channel_name_keeps_readable_team_name_and_discord_limit() -> None:
    from services.ordinary_tournament_team_channels import team_voice_channel_name

    assert team_voice_channel_name("  Team Spirit  ", 12) == "Team Spirit"
    assert team_voice_channel_name("", 12) == "Команда 12"
    assert len(team_voice_channel_name("Очень длинная команда " * 20, 12)) <= 100


def test_persistent_state_opens_once_and_closes_after_last_result() -> None:
    assert "ordinary_tournament_team_channel_access" in MIGRATION
    assert "ordinary_tournament_team_channels" in MIGRATION
    assert "ordinary_tournament_team_channel_members" in MIGRATION
    assert "REFERENCES tournaments(id) ON DELETE CASCADE" in MIGRATION
    assert "REFERENCES tournament_team_applications(id) ON DELETE CASCADE" in MIGRATION
    assert "notify_bot_scheduled_events" in MIGRATION
    assert "register_scheduled_job" in COG


def test_scheduler_contract_uses_start_and_every_final_match() -> None:
    from services import ordinary_tournament_team_channel_sync as sync

    source = Path(sync.__file__).read_text(encoding="utf-8")
    assert "tournament.start_at <= NOW()" in source
    assert "tournament.tournament_type = 'ordinary'" in source
    assert "application.status = 'approved'" in source
    assert "member.invitation_status = 'accepted'" in source
    assert "match.status NOT IN ('finished', 'cancelled')" in source
    assert "delete_team_voice_channel" in source


@pytest.mark.asyncio
async def test_start_creates_one_voice_channel_with_team_only_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from services import ordinary_tournament_team_channels as channel_service
    from services.ordinary_tournament_team_channels import (
        TeamVoiceChannelTarget,
        ensure_team_voice_channel,
    )

    everyone = discord.Object(id=1)
    participant = discord.Object(id=2)
    created: dict[str, object] = {}

    class FakeGuild:
        default_role = everyone

        async def create_voice_channel(self, name: str, **options: object):
            created.update(name=name, **options)
            return SimpleNamespace(id=99)

    async def registered_members(
        _guild: object,
        participant_ids: tuple[int, ...],
    ) -> list[discord.Object]:
        return [participant] if participant_ids == (2,) else []

    async def missing_channel(*_args: object) -> None:
        return None

    monkeypatch.setattr(channel_service, "_registered_members", registered_members)
    monkeypatch.setattr(channel_service, "_voice_channel", missing_channel)
    target = TeamVoiceChannelTarget(
        tournament_id=7,
        application_id=12,
        team_name="Team Spirit",
        discord_channel_id=None,
        participant_ids=(2,),
        managed_participant_ids=(),
    )

    channel = await ensure_team_voice_channel(
        SimpleNamespace(guild=FakeGuild()),
        target,
    )

    assert channel.id == 99
    assert created["name"] == "Team Spirit"
    overwrites = created["overwrites"]
    assert isinstance(overwrites, dict)
    assert overwrites[everyone].view_channel is False
    assert overwrites[participant].connect is True


@pytest.mark.asyncio
async def test_existing_team_channel_is_reused_without_permission_changes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from services import ordinary_tournament_team_channels as channel_service
    from services.ordinary_tournament_team_channels import (
        TeamVoiceChannelTarget,
        ensure_team_voice_channel,
    )

    everyone = discord.Object(id=1)
    participant = discord.Object(id=2)

    class ExistingChannel:
        id = 99
        name = "Team Spirit"

        def overwrites_for(self, target: object) -> discord.PermissionOverwrite:
            if target is everyone:
                return discord.PermissionOverwrite(view_channel=False, connect=False)
            return discord.PermissionOverwrite(
                view_channel=True,
                connect=True,
                speak=True,
            )

        async def set_permissions(self, *_args: object, **_options: object) -> None:
            raise AssertionError("Correct permissions must not be written again")

        async def edit(self, **_options: object) -> None:
            raise AssertionError("Correct channel name must not be written again")

    existing_channel = ExistingChannel()

    async def registered_members(
        _guild: object,
        participant_ids: tuple[int, ...],
    ) -> list[discord.Object]:
        return [participant] if participant_ids == (2,) else []

    async def current_channel(*_args: object) -> ExistingChannel:
        return existing_channel

    monkeypatch.setattr(channel_service, "_registered_members", registered_members)
    monkeypatch.setattr(channel_service, "_voice_channel", current_channel)
    target = TeamVoiceChannelTarget(
        tournament_id=7,
        application_id=12,
        team_name="Team Spirit",
        discord_channel_id=99,
        participant_ids=(2,),
        managed_participant_ids=(2,),
    )

    channel = await ensure_team_voice_channel(
        SimpleNamespace(guild=SimpleNamespace(default_role=everyone)),
        target,
    )

    assert channel is existing_channel
