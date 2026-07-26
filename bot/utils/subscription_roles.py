from collections.abc import Iterable
from typing import Protocol


SUBSCRIPTION_ROLE_NAMES = (
    "Руна Регенерации",
    "Руна Ускорения",
    "Руна Невидимости",
    "Руна Волшебства",
    "Руна Иллюзий",
    "Руна Усиления урона",
    "Руна Воды",
)
SUBSCRIPTION_ROLE_NAMES_BY_KEY = {
    role_name.casefold(): role_name for role_name in SUBSCRIPTION_ROLE_NAMES
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
    canonical_name = SUBSCRIPTION_ROLE_NAMES_BY_KEY.get(role_name.casefold())
    if canonical_name:
        return canonical_name
    if role.id in configured_role_ids:
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
