from unittest.mock import AsyncMock

import pytest

@pytest.fixture
def current_compendium_modules(monkeypatch):
    for key in ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"]:
        monkeypatch.setenv(key, "test")
    from cogs.compendium_admin import CompendiumAdmin
    from services.compendium_star_service import CompendiumStarAdjustmentError, CompendiumStarService
    return CompendiumAdmin, CompendiumStarAdjustmentError, CompendiumStarService


def test_all_four_commands_describe_october_and_adjustments_require_a_reason(current_compendium_modules):
    CompendiumAdmin, _, _ = current_compendium_modules
    commands = [CompendiumAdmin.add_stars, CompendiumAdmin.delete_stars,
                CompendiumAdmin.announce_compendium, CompendiumAdmin.complete_stars]
    assert [command.name for command in commands] == ["add_stars", "delete_stars", "compendium", "completestars"]
    assert all("октябрь" in command.description for command in commands)
    for command in commands[:2]:
        reason = next(parameter for parameter in command.parameters if parameter.name == "reason")
        assert reason.required


@pytest.mark.asyncio
async def test_a_finished_period_blocks_adjustments_before_any_database_access(monkeypatch, current_compendium_modules):
    _, CompendiumStarAdjustmentError, CompendiumStarService = current_compendium_modules
    monkeypatch.setattr("services.compendium_star_service.is_current_compendium_active", lambda: False)
    with pytest.raises(CompendiumStarAdjustmentError, match="Октябрьский компендиум"):
        await CompendiumStarService().adjust_stars("frokeng", 1, 1, "Admin", "Correction")


@pytest.mark.asyncio
async def test_change_stars_passes_the_administrator_and_reason_to_the_current_service(current_compendium_modules):
    from types import SimpleNamespace
    CompendiumAdmin, _, _ = current_compendium_modules

    cog = object.__new__(CompendiumAdmin)
    cog.star_service = SimpleNamespace(adjust_stars=AsyncMock(return_value=SimpleNamespace(
        nickname="frokeng", amount=2, total_stars=20)))
    interaction = SimpleNamespace(response=SimpleNamespace(defer=AsyncMock()),
                                  followup=SimpleNamespace(send=AsyncMock()), user=SimpleNamespace(id=123))
    await cog.change_stars(interaction, "frokeng", 2, "Correction")
    assert cog.star_service.adjust_stars.await_args.kwargs["reason"] == "Correction"
    assert cog.star_service.adjust_stars.await_args.kwargs["administrator_id"] == 123
    assert "не в Гонке" in interaction.followup.send.await_args.args[0]
