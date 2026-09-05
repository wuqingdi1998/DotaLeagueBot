from typing import Any


MINIMUM_MANUAL_TIER = 0
MAXIMUM_MANUAL_TIER = 12


def automatic_tier(rank_tier: int | None) -> int:
    raw_tier = int(rank_tier or 0)
    return raw_tier // 10 if raw_tier >= 10 else raw_tier


def initial_registration_tier_status(rank_tier: int | None) -> str:
    return "outdated" if automatic_tier(rank_tier) >= 8 else "current"


def effective_player_tier(player: Any) -> int:
    manual_tier = int(getattr(player, "internal_rating", 0) or 0)
    if manual_tier > 0:
        return manual_tier
    return automatic_tier(getattr(player, "rank_tier", 0))


def update_player_tier_values(tier: int) -> dict[str, int | str]:
    numeric_tier = int(tier)
    if not MINIMUM_MANUAL_TIER <= numeric_tier <= MAXIMUM_MANUAL_TIER:
        raise ValueError("Тир должен быть от 0 до 12")
    return {
        "internal_rating": numeric_tier,
        "tier_status": "current",
    }


def set_player_tier(player: Any, tier: int) -> None:
    for field, value in update_player_tier_values(tier).items():
        setattr(player, field, value)
