from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from discord import app_commands

from cogs.subscription_admin import SubscriptionAdmin
from services.subscription_role_grants import (
    SubscriptionRoleGrant,
    subscription_expiration,
)
from utils.subscription_roles import SUBSCRIPTION_ROLE_IDS_BY_NAME


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MIGRATION = (
    PROJECT_ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0135_temporary_subscription_roles.sql"
).read_text(encoding="utf-8")


def test_subscription_role_ids_match_the_seven_runes() -> None:
    assert SUBSCRIPTION_ROLE_IDS_BY_NAME == {
        "Руна Воды": 1248371813378162789,
        "Руна Усиления урона": 1248377068689952890,
        "Руна Иллюзий": 1248376138426880111,
        "Руна Волшебства": 1248373380600823850,
        "Руна Невидимости": 1249322473418264639,
        "Руна Ускорения": 1248378138669350942,
        "Руна Регенерации": 1330226582660448327,
    }


def test_subscription_expiration_uses_the_selected_number_of_days() -> None:
    now = datetime(2026, 9, 12, 10, 30, tzinfo=timezone.utc)

    assert subscription_expiration(30, now=now) == now + timedelta(days=30)


def test_give_subscribe_is_an_admin_guild_command_with_bounded_days() -> None:
    command = SubscriptionAdmin.give_subscribe
    parameters = {parameter.name: parameter for parameter in command.parameters}

    assert command.name == "give_subscribe"
    assert command.guild_only is True
    assert command.default_permissions is not None
    assert command.default_permissions.administrator is True
    assert len(command.checks) == 1
    assert parameters["days"].min_value == 1
    assert parameters["days"].max_value == 3650
    assert {
        choice.name: int(choice.value) for choice in parameters["role"].choices
    } == SUBSCRIPTION_ROLE_IDS_BY_NAME


def test_temporary_role_grants_wake_the_durable_scheduler() -> None:
    assert "CREATE TABLE IF NOT EXISTS temporary_subscription_roles" in MIGRATION
    assert "expires_at TIMESTAMPTZ NOT NULL" in MIGRATION
    assert "temporary_subscription_role_scheduler_wakeup" in MIGRATION
    assert "notify_bot_scheduled_events()" in MIGRATION


@pytest.mark.asyncio
async def test_give_subscribe_assigns_role_and_saves_expiration() -> None:
    role = SimpleNamespace(id=1248371813378162789, mention="<@&water>")
    member = SimpleNamespace(
        id=42,
        mention="<@42>",
        roles=[],
        add_roles=AsyncMock(),
    )
    guild = SimpleNamespace(id=7, get_role=lambda role_id: role)
    interaction = SimpleNamespace(
        guild=guild,
        user=SimpleNamespace(id=99),
        response=SimpleNamespace(defer=AsyncMock()),
        followup=SimpleNamespace(send=AsyncMock()),
    )

    async def schedule_grant(**values: object) -> SubscriptionRoleGrant:
        return SubscriptionRoleGrant(
            guild_id=int(values["guild_id"]),
            member_id=int(values["member_id"]),
            role_id=int(values["role_id"]),
            expires_at=values["expires_at"],
        )

    service = SimpleNamespace(schedule_grant=AsyncMock(side_effect=schedule_grant))
    cog = SubscriptionAdmin(SimpleNamespace(), grant_service=service)
    selected_role = app_commands.Choice(name="Руна Воды", value=str(role.id))
    earliest_expiration = datetime.now(timezone.utc) + timedelta(days=30)

    await SubscriptionAdmin.give_subscribe.callback(
        cog,
        interaction,
        member,
        selected_role,
        30,
    )

    latest_expiration = datetime.now(timezone.utc) + timedelta(days=30)
    saved_expiration = service.schedule_grant.await_args.kwargs["expires_at"]
    assert earliest_expiration <= saved_expiration <= latest_expiration
    member.add_roles.assert_awaited_once()
    interaction.response.defer.assert_awaited_once_with(ephemeral=True)
    interaction.followup.send.assert_awaited_once()


@pytest.mark.asyncio
async def test_due_subscription_role_is_removed_and_completed() -> None:
    role = SimpleNamespace(id=1248371813378162789)
    member = SimpleNamespace(
        id=42,
        roles=[role],
        remove_roles=AsyncMock(),
    )
    guild = SimpleNamespace(
        get_role=lambda role_id: role if role_id == role.id else None,
        get_member=lambda member_id: member if member_id == member.id else None,
    )
    bot = SimpleNamespace(get_guild=lambda guild_id: guild if guild_id == 7 else None)
    service = SimpleNamespace(complete_grant=AsyncMock(return_value=True))
    cog = SubscriptionAdmin(bot, grant_service=service)
    grant = SubscriptionRoleGrant(
        guild_id=7,
        member_id=42,
        role_id=role.id,
        expires_at=datetime(2026, 9, 13, tzinfo=timezone.utc),
    )

    await cog.expire_grant(grant)

    member.remove_roles.assert_awaited_once_with(
        role,
        reason="Завершился срок подписки, выданной через /give_subscribe",
    )
    service.complete_grant.assert_awaited_once_with(grant)


@pytest.mark.asyncio
async def test_extended_subscription_is_restored_during_expiration_race() -> None:
    role = SimpleNamespace(id=1248371813378162789)
    member = SimpleNamespace(
        id=42,
        roles=[role],
        remove_roles=AsyncMock(),
        add_roles=AsyncMock(),
    )
    guild = SimpleNamespace(
        get_role=lambda role_id: role if role_id == role.id else None,
        get_member=lambda member_id: member if member_id == member.id else None,
    )
    bot = SimpleNamespace(get_guild=lambda guild_id: guild if guild_id == 7 else None)
    service = SimpleNamespace(complete_grant=AsyncMock(return_value=False))
    cog = SubscriptionAdmin(bot, grant_service=service)
    old_grant = SubscriptionRoleGrant(
        guild_id=7,
        member_id=42,
        role_id=role.id,
        expires_at=datetime(2026, 9, 13, tzinfo=timezone.utc),
    )

    await cog.expire_grant(old_grant)

    member.add_roles.assert_awaited_once_with(
        role,
        reason="Срок подписки был продлён во время снятия роли",
    )
