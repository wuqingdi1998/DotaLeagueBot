from pathlib import Path

from services.season_ranked_win_reminders import ranked_win_reminder_message


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0122_season_ranked_win_reminders.sql"
).read_text(encoding="utf-8")
SERVICE = (
    ROOT / "bot" / "services" / "season_ranked_win_reminders.py"
).read_text(encoding="utf-8")
BRIDGE = (ROOT / "bot" / "cogs" / "website_bridge.py").read_text(
    encoding="utf-8"
)
DEPLOYMENT = (ROOT / ".github" / "workflows" / "deploy.yml").read_text(
    encoding="utf-8"
)


def test_message_contains_personal_shortage_and_round_link() -> None:
    assert ranked_win_reminder_message(
        round_number=3,
        round_url="https://lsesports.ru/tournaments/league-season-9?round=3",
        missing_primary_wins=6,
        missing_secondary_wins=3,
    ) == (
        "Ты зарегистрирован на [3 тур]"
        "(https://lsesports.ru/tournaments/league-season-9?round=3) "
        "Linken's Sphere Esports, на данный момент для участия тебе не хватает "
        "**6 рейтинговых побед на основной роли** и "
        "**3 рейтинговых побед на дополнительной роли**. "
        "Сняться без штрафа можно не позже чем за 24 часа до старта тура!\n\n"
        "Возможны ошибки при подсчёте рейтинговых побед, в случае недосчёта "
        "матчей и обнаруженной очевидной ошибки сообщайте об этом "
        "<@311247030422863882> заранее!"
    )


def test_settings_hold_requirements_and_both_delivery_delays() -> None:
    assert "primary_role_wins_required" in MIGRATION
    assert "secondary_role_wins_required" in MIGRATION
    assert "10," in MIGRATION
    assert "4," in MIGRATION
    assert "registration_delay_minutes" in MIGRATION
    assert "round_lead_minutes" in MIGRATION
    assert "2880" in MIGRATION
    assert "registration_reminders_start_at" in MIGRATION
    assert "2026-09-05 13:00:00+03" in MIGRATION


def test_candidates_require_shortage_on_both_roles_and_fresh_counts() -> None:
    assert "primary_wins < primary_role_wins_required" in SERVICE
    assert "secondary_wins < secondary_role_wins_required" in SERVICE
    assert "ranked_wins_checked_at >= counts_fresh_after" in SERVICE
    assert "registration_created_at <= reminder_at" in SERVICE
    assert "registration_created_at > registration_reminders_start_at" in SERVICE


def test_each_round_and_registration_notice_is_deduplicated() -> None:
    assert "season_ranked_wins_registration_reminder" in SERVICE
    assert "season_ranked_wins_48_hour_reminder" in SERVICE
    assert "season_ranked_wins_first_round_catch_up" in MIGRATION
    assert "ON CONFLICT (discord_id, season_round_id, event_type)" in SERVICE
    assert "DO NOTHING" in SERVICE


def test_bridge_queues_reminders_before_delivering_outbox() -> None:
    queue_position = BRIDGE.index("await queue_due_ranked_win_reminders")
    delivery_position = BRIDGE.index("SELECT id, discord_id, event_type")
    assert queue_position < delivery_position
    assert "services/season_ranked_win_reminders.py" in DEPLOYMENT
