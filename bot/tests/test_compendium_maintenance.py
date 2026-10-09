from unittest.mock import AsyncMock

import pytest

from cogs.compendium_maintenance import CompendiumMaintenance


@pytest.mark.asyncio
@pytest.mark.parametrize("is_active", [True, False])
async def test_maintenance_repairs_old_evidence_without_reopening_finished_tasks(monkeypatch, is_active):
    request = AsyncMock()
    monkeypatch.setattr("cogs.compendium_maintenance.post_site_scheduler_request", request)
    monkeypatch.setattr("cogs.compendium_maintenance.is_current_compendium_active", lambda: is_active)
    cog = object.__new__(CompendiumMaintenance)
    await CompendiumMaintenance.maintain_compendium.coro(cog)
    paths = [call.args[0] for call in request.await_args_list]
    assert paths[0] == "/api/internal/compendium/restore-evidence"
    assert ("/api/internal/compendium/generate" in paths) == is_active
    assert ("/api/internal/compendium/verify-arcana" in paths) == is_active
    assert len(paths) == (3 if is_active else 1)
