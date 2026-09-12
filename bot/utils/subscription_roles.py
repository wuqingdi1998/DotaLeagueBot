from collections.abc import Iterable
from typing import Protocol


SUBSCRIPTION_ROLE_IDS_BY_NAME = {
    "Руна Воды": 1248371813378162789,
    "Руна Усиления урона": 1248377068689952890,
    "Руна Иллюзий": 1248376138426880111,
    "Руна Волшебства": 1248373380600823850,
    "Руна Невидимости": 1249322473418264639,
    "Руна Ускорения": 1248378138669350942,
    "Руна Регенерации": 1330226582660448327,
}
SUBSCRIPTION_ROLE_NAMES = tuple(SUBSCRIPTION_ROLE_IDS_BY_NAME)
SUPPORTER_ROLE_NAME = "Суппортеры"
PRIORITY_REGISTRATION_ROLE_IDS = {
    1506419804125528267,
    1506420703254286478,
}
TRACKED_PLAYER_ROLE_NAMES = (*SUBSCRIPTION_ROLE_NAMES, SUPPORTER_ROLE_NAME)
TRACKED_PLAYER_ROLE_NAMES_BY_KEY = {
    role_name.casefold(): role_name for role_name in TRACKED_PLAYER_ROLE_NAMES
}


class RoleColor(Protocol):
    @property
    def value(self) -> int: ...


class DiscordRole(Protocol):
    @property
    def id(self) -> int: ...

    @property
    def name(self) -> str: ...

    @property
    def color(self) -> RoleColor: ...


def canonical_subscription_role_name(
    role: DiscordRole,
    configured_role_ids: set[int],
) -> str | None:
    role_name = role.name.strip()
    canonical_name = TRACKED_PLAYER_ROLE_NAMES_BY_KEY.get(role_name.casefold())
    if canonical_name:
        return canonical_name
    if role.id in configured_role_ids | PRIORITY_REGISTRATION_ROLE_IDS:
        return role_name
    return None


def subscription_role_rows(
    player_id: int,
    roles: Iterable[DiscordRole],
    configured_role_ids: set[int],
) -> list[dict[str, int | str]]:
    rows: list[dict[str, int | str]] = []
    for role in roles:
        role_name = canonical_subscription_role_name(
            role,
            configured_role_ids,
        )
        if role_name is None:
            continue
        rows.append(
            {
                "player_id": player_id,
                "role_id": role.id,
                "role_name": role_name,
                "role_color": role.color.value,
            }
        )
    return rows
