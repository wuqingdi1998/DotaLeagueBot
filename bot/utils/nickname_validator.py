import re

NICKNAME_MIN_LENGTH = 2
NICKNAME_MAX_LENGTH = 20
NICKNAME_SPECIAL_POOL = "~`!@#$:;%^&*(){}[]/<>.?_-"

_ALLOWED_PATTERN = re.compile(
    r"^[a-zA-Z0-9а-яА-ЯёЁ " + re.escape(NICKNAME_SPECIAL_POOL) + r"]+$"
)


def validate_nickname(nickname: str) -> tuple[bool, str | None]:
    """Return (True, None) if valid, else (False, error_message_ru)."""
    if not (NICKNAME_MIN_LENGTH <= len(nickname) <= NICKNAME_MAX_LENGTH):
        return False, f"Никнейм должен быть от {NICKNAME_MIN_LENGTH} до {NICKNAME_MAX_LENGTH} символов."
    if not _ALLOWED_PATTERN.match(nickname):
        return False, "Никнейм может содержать только русские/английские буквы, цифры, пробел и допустимые спецсимволы."
    special_count = sum(1 for c in nickname if c in NICKNAME_SPECIAL_POOL)
    if special_count > 1:
        return False, (
            f"В никнейме разрешен максимум **1** спецсимвол из списка: `{NICKNAME_SPECIAL_POOL}`.\n"
            f"У вас найдено: **{special_count}**."
        )
    return True, None
