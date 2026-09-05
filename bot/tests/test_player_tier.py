from types import SimpleNamespace

import pytest

from services.player_tier import (
    effective_player_tier,
    initial_registration_tier_status,
    set_player_tier,
)


@pytest.mark.parametrize(
    ("internal_rating", "rank_tier", "expected"),
    [
        (12, 80, 12),
        (0, 85, 8),
        (0, 8, 8),
        (0, 0, 0),
    ],
)
def test_effective_player_tier_uses_one_scale(
    internal_rating: int,
    rank_tier: int,
    expected: int,
) -> None:
    player = SimpleNamespace(
        internal_rating=internal_rating,
        rank_tier=rank_tier,
    )
    assert effective_player_tier(player) == expected


@pytest.mark.parametrize("previous_status", ["current", "outdated", "inactive"])
@pytest.mark.parametrize("tier", [0, 7, 12])
def test_numeric_tier_change_always_restores_current_status(
    previous_status: str,
    tier: int,
) -> None:
    player = SimpleNamespace(internal_rating=4, tier_status=previous_status)
    set_player_tier(player, tier)
    assert player.internal_rating == tier
    assert player.tier_status == "current"


@pytest.mark.parametrize("tier", [-1, 13])
def test_manual_tier_range_is_validated(tier: int) -> None:
    player = SimpleNamespace(internal_rating=4, tier_status="inactive")
    with pytest.raises(ValueError):
        set_player_tier(player, tier)


@pytest.mark.parametrize(
    ("rank_tier", "expected_status"),
    [
        (0, "current"),
        (8, "outdated"),
        (79, "current"),
        (80, "outdated"),
        (85, "outdated"),
    ],
)
def test_new_titan_starts_with_outdated_tier(
    rank_tier: int,
    expected_status: str,
) -> None:
    assert initial_registration_tier_status(rank_tier) == expected_status
