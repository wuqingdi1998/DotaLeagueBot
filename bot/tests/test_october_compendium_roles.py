from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ROLE_SERVICE = (ROOT / "bot/services/october_compendium_roles.py").read_text(
    encoding="utf-8"
)
PROFILE = (ROOT / "bot/cogs/profile.py").read_text(encoding="utf-8")
DOCKERFILE = (ROOT / "bot/Dockerfile").read_text(encoding="utf-8")


def test_clan_roles_are_positioned_below_view_role_and_have_site_icons() -> None:
    assert 'REFERENCE_ROLE_NAME = "Просто посмотреть"' in ROLE_SERVICE
    assert 'reference.position - 1' in ROLE_SERVICE
    assert 'display_icon=icon' in ROLE_SERVICE
    assert 'morbus-emblem-v2.webp' in DOCKERFILE
    assert 'panacea-emblem.webp' in DOCKERFILE


def test_registration_assigns_new_player_to_a_clan() -> None:
    assert "assign_october_clan_after_registration" in PROFILE
    assert "ORDER BY COALESCE(SUM(member.total_points), 0)" in ROLE_SERVICE


def test_roles_are_removed_one_day_after_compendium() -> None:
    assert "2026, 10, 27" in ROLE_SERVICE
    assert "role.delete" in ROLE_SERVICE
