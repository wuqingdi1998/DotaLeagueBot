from pathlib import Path


PROFILE_COG = Path(__file__).resolve().parents[1] / "cogs" / "profile.py"


def test_registration_panel_uses_server_name_in_title() -> None:
    source = PROFILE_COG.read_text(encoding="utf-8")

    assert "# 🏆 Регистрация на сервере Linken's Sphere Esports\\n" in source
    assert "# 🏆 Регистрация в Лиге\\n" not in source
