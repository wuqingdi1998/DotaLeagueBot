from services.compendium_unclaimed_stars import (
    UnclaimedChallenge,
    UnclaimedChallengePlayer,
    UnclaimedChallengesReport,
    format_unclaimed_challenges_report,
)


def test_unclaimed_report_lists_every_challenge_for_each_player() -> None:
    report = UnclaimedChallengesReport(
        date_key="2026-08-11",
        checked_count=12,
        failed_count=1,
        players=(
            UnclaimedChallengePlayer(
                player_name="Winner",
                challenges=(
                    UnclaimedChallenge(
                        kind="daily",
                        title="Испытание 1",
                        detail="Lina",
                        match_ids=("9001",),
                    ),
                    UnclaimedChallenge(
                        kind="star-race",
                        title="Побеждает тот, у кого упадёт трон",
                        detail="32 000 / 30 000 урона по строениям",
                        match_ids=("9001", "9002"),
                    ),
                ),
            ),
        ),
    )

    messages = format_unclaimed_challenges_report(report)

    assert len(messages) == 1
    assert "Winner" in messages[0]
    assert "Испытание 1 — Lina" in messages[0]
    assert "Побеждает тот, у кого упадёт трон" in messages[0]
    assert "https://www.opendota.com/matches/9001" in messages[0]
    assert "Проверено участников: **12**" in messages[0]
    assert "Не удалось проверить: **1**" in messages[0]


def test_unclaimed_report_explains_when_nobody_was_missed() -> None:
    report = UnclaimedChallengesReport(
        date_key="2026-08-11",
        checked_count=12,
        failed_count=0,
        players=(),
    )

    messages = format_unclaimed_challenges_report(report)

    assert "Выполненных, но не засчитанных испытаний не найдено" in messages[0]


def test_unclaimed_report_stays_inside_discord_message_limit() -> None:
    players = tuple(
        UnclaimedChallengePlayer(
            player_name=f"Player {index}",
            challenges=(
                UnclaimedChallenge(
                    kind="daily",
                    title="Испытание 1",
                    detail="Lina",
                    match_ids=(str(9000 + index),),
                ),
            ),
        )
        for index in range(100)
    )
    report = UnclaimedChallengesReport(
        date_key="2026-08-11",
        checked_count=100,
        failed_count=0,
        players=players,
    )

    messages = format_unclaimed_challenges_report(report)

    assert len(messages) > 1
    assert all(len(message) <= 2000 for message in messages)
    assert sum(
        message.count("https://www.opendota.com/matches/")
        for message in messages
    ) == 100
