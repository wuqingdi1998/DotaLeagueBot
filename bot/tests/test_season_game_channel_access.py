from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import discord
import pytest

from services.season_game_channel_access import (
    category_visibility_overwrite,
    set_category_public,
)


ROOT = Path(__file__).parents[1]
MIGRATION = (
    ROOT
    / "database"
    / "migrations"
    / "0134_season_game_channel_access.sql"
).read_text(encoding="utf-8")


def test_category_visibility_preserves_other_everyone_permissions() -> None:
    current = discord.PermissionOverwrite(
        view_channel=False,
        send_messages=False,
        read_message_history=True,
    )

    public = category_visibility_overwrite(current, is_public=True)
    private = category_visibility_overwrite(public, is_public=False)

    assert public.view_channel is True
    assert public.send_messages is False
    assert public.read_message_history is True
    assert private.view_channel is False
    assert private.send_messages is False
    assert private.read_message_history is True


@pytest.mark.asyncio
async def test_public_category_update_targets_everyone_role() -> None:
    everyone = discord.Object(id=1)
    updates: list[tuple[object, discord.PermissionOverwrite, str]] = []

    class FakeCategory:
        guild = SimpleNamespace(default_role=everyone)

        def overwrites_for(self, _target: object) -> discord.PermissionOverwrite:
            return discord.PermissionOverwrite(view_channel=False, send_messages=False)

        async def set_permissions(
            self,
            target: object,
            *,
            overwrite: discord.PermissionOverwrite,
            reason: str,
        ) -> None:
            updates.append((target, overwrite, reason))

    await set_category_public(FakeCategory(), is_public=True)

    target, overwrite, reason = updates[0]
    assert target is everyone
    assert overwrite.view_channel is True
    assert overwrite.send_messages is False
    assert "лобби" in reason.lower()


def test_access_window_waits_for_every_lobby_then_ten_minutes() -> None:
    assert "season_game_channel_access_windows" in MIGRATION
    assert "NEW.status = 'completed'" in MIGRATION
    assert "OLD.status IS DISTINCT FROM NEW.status" in MIGRATION
    assert "sibling.status NOT IN ('completed', 'cancelled')" in MIGRATION
    assert "INTERVAL '10 minutes'" in MIGRATION
    assert "season_game_channel_access_scheduler_wakeup" in MIGRATION
