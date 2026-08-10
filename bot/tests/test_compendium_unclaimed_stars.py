from services.compendium_unclaimed_stars import (
    UnclaimedStarRacePlayer,
    UnclaimedStarRaceReport,
    format_unclaimed_star_race_report,
)


def test_unclaimed_star_report_lists_player_hero_and_match() -> None:
    report = UnclaimedStarRaceReport(
        is_available=True,
        date_key="2026-08-10",
        quest_title="Легенда СНГ",
        checked_count=12,
        failed_count=1,
        players=(
            UnclaimedStarRacePlayer(
                player_name="Winner",
                hero_name="Lina",
                match_id="9001",
            ),
        ),
    )

    messages = format_unclaimed_star_race_report(report)

    assert len(messages) == 1
    assert "Winner — Lina" in messages[0]
    assert "https://www.opendota.com/matches/9001" in messages[0]
    assert "Проверено участников: **12**" in messages[0]
    assert "Не удалось проверить: **1**" in messages[0]


def test_unclaimed_star_report_explains_when_nobody_was_missed() -> None:
    report = UnclaimedStarRaceReport(
        is_available=True,
        date_key="2026-08-10",
        quest_title="Легенда СНГ",
        checked_count=12,
        failed_count=0,
        players=(),
    )

    messages = format_unclaimed_star_race_report(report)

    assert "Таких участников не найдено" in messages[0]


def test_unclaimed_star_report_stays_inside_discord_message_limit() -> None:
    players = tuple(
        UnclaimedStarRacePlayer(
            player_name=f"Player {index}",
            hero_name="Lina",
            match_id=str(9000 + index),
        )
        for index in range(100)
    )
    report = UnclaimedStarRaceReport(
        is_available=True,
        date_key="2026-08-10",
        quest_title="Легенда СНГ",
        checked_count=100,
        failed_count=0,
        players=players,
    )

    messages = format_unclaimed_star_race_report(report)

    assert len(messages) > 1
    assert all(len(message) <= 2000 for message in messages)
    assert sum(message.count("https://www.opendota.com/matches/") for message in messages) == 100
