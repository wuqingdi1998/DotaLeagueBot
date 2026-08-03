from types import SimpleNamespace

from utils.subscription_roles import (
    SUPPORTER_ROLE_NAME,
    SUBSCRIPTION_ROLE_NAMES,
    canonical_subscription_role_name,
    subscription_role_rows,
)


def role(role_id: int, name: str, color: int = 0x00C3FF) -> SimpleNamespace:
    return SimpleNamespace(
        id=role_id,
        name=name,
        color=SimpleNamespace(value=color),
    )


def test_all_seven_runes_are_recognized_by_name_without_configured_ids() -> None:
    assert len(SUBSCRIPTION_ROLE_NAMES) == 7
    for role_id, role_name in enumerate(SUBSCRIPTION_ROLE_NAMES, start=1):
        assert canonical_subscription_role_name(
            role(role_id, role_name),
            set(),
        ) == role_name


def test_water_rune_is_written_to_profile_role_rows() -> None:
    member = SimpleNamespace(
        id=42,
        roles=[
            role(1, "@everyone", 0),
            role(2, "Руна Воды", 0x36C5F0),
        ],
    )

    assert subscription_role_rows(member.id, member.roles, set()) == [
        {
            "player_id": 42,
            "role_id": 2,
            "role_name": "Руна Воды",
            "role_color": 0x36C5F0,
        }
    ]


def test_supporters_role_is_stored_for_feature_access() -> None:
    supporter = role(8, SUPPORTER_ROLE_NAME, 0xE0A62F)

    assert canonical_subscription_role_name(supporter, set()) == SUPPORTER_ROLE_NAME


def test_unrelated_discord_roles_are_not_written() -> None:
    assert (
        canonical_subscription_role_name(
            role(7, "Организатор"),
            set(),
        )
        is None
    )
