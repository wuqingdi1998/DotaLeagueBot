import os
from pathlib import Path

os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")

from cogs.profile import POSITION_ROLE_NAMES, RegisterModal
from utils.nickname_validator import NICKNAME_MAX_LENGTH, validate_nickname


PROFILE_COG = Path(__file__).resolve().parents[1] / "cogs" / "profile.py"


def test_registration_panel_uses_server_name_in_title() -> None:
    source = PROFILE_COG.read_text(encoding="utf-8")

    assert "# 🏆 Регистрация на сервере Linken's Sphere Esports\\n" in source
    assert "# 🏆 Регистрация в Лиге\\n" not in source


def test_registration_modal_uses_two_position_selects() -> None:
    modal_payload = RegisterModal().to_dict()
    position_fields = [
        component
        for component in modal_payload["components"]
        if component["label"] in {"Основная позиция", "Дополнительная позиция"}
    ]

    assert len(modal_payload["components"]) == 5
    assert all(component["type"] == 18 for component in modal_payload["components"])
    assert [field["label"] for field in position_fields] == [
        "Основная позиция",
        "Дополнительная позиция",
    ]
    assert all(field["component"]["type"] == 3 for field in position_fields)
    assert all(field["component"]["required"] is True for field in position_fields)
    assert all(
        [option["value"] for option in field["component"]["options"]]
        == list(POSITION_ROLE_NAMES)
        for field in position_fields
    )


def test_registration_nickname_is_limited_to_fifteen_characters() -> None:
    modal_payload = RegisterModal().to_dict()
    nickname_field = next(
        component
        for component in modal_payload["components"]
        if component["label"] == "Ваш никнейм в лиге"
    )

    assert NICKNAME_MAX_LENGTH == 15
    assert nickname_field["component"]["max_length"] == NICKNAME_MAX_LENGTH
    assert validate_nickname("a" * NICKNAME_MAX_LENGTH) == (True, None)
    assert validate_nickname("a" * (NICKNAME_MAX_LENGTH + 1)) == (
        False,
        "Никнейм должен быть от 2 до 15 символов.",
    )
