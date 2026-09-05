from pathlib import Path

from utils.website_notifications import (
    MEMBER_WELCOME_PREVIEW_EVENT_TYPE,
    member_welcome_embed,
    notification_embed,
    notification_outbox_embed,
)


BRIDGE = (
    Path(__file__).parents[1] / "cogs" / "website_bridge.py"
).read_text(encoding="utf-8")


def test_notification_embed_uses_brand_color() -> None:
    embed = notification_embed("Приглашение", "Вас пригласили", None)
    assert embed.title == "Приглашение"
    assert embed.description == "Вас пригласили"
    assert embed.color.value == 0x00C3FF


def test_notification_embed_adds_site_link() -> None:
    embed = notification_embed(
        "Матч скоро", "Подтвердите готовность", "https://example.test"
    )
    assert len(embed.fields) == 1
    assert embed.fields[0].value == "https://example.test"


def test_notification_embed_omits_empty_site_link() -> None:
    embed = notification_embed("Статус", "Команда допущена", None)
    assert len(embed.fields) == 0


def test_member_welcome_contains_clickable_registration_and_admin_links() -> None:
    embed = member_welcome_embed()

    assert embed.title == "Привет!"
    assert embed.description == (
        "Ты зашёл на сервер Linken's Sphere Esports – это площадка для любительских "
        "турниров для игроков различных рангов.\n\n"
        "Для участия в наших ивентах нужно зарегистрироваться через "
        "[канал регистрации](https://discord.com/channels/"
        "328205360466755584/1457019432034504776).\n"
        "Основная информация о турнирах и регистрация – на "
        "[нашем сайте](https://lsesports.ru/).\n"
        "По любым вопросам, касающимся сервера, можно написать администратору – "
        "<@311247030422863882>."
    )


def test_welcome_preview_uses_the_new_member_message() -> None:
    embed = notification_outbox_embed(
        MEMBER_WELCOME_PREVIEW_EVENT_TYPE,
        "Текст из очереди",
        "Этот текст не должен попасть в предпросмотр",
        None,
    )

    assert embed.to_dict() == member_welcome_embed().to_dict()


def test_bridge_stores_sent_message_ids_for_later_cleanup() -> None:
    assert "SELECT id, discord_id, event_type" in BRIDGE
    assert "notification_outbox_embed(" in BRIDGE
    assert 'notification["status"] == "delete_pending"' in BRIDGE
    assert "discord_message_id = :message_id" in BRIDGE
    assert "await message.delete()" in BRIDGE
    assert "status = 'deleted'" in BRIDGE


def test_bridge_queues_one_tournament_checkin_message_per_captain() -> None:
    assert "_queue_tournament_checkins" in BRIDGE
    assert "MIN(scheduled_at)" in BRIDGE
    assert "t.check_in_minutes" in BRIDGE
    assert "tournament_check_in" in BRIDGE


def test_bridge_queues_season_round_checkin_messages_and_missing_report() -> None:
    assert "_queue_season_round_checkins" in BRIDGE
    assert "_queue_season_round_missing_checkins" in BRIDGE
    assert "season_round_check_in_open" in BRIDGE
    assert "season_round_check_in_missing" in BRIDGE
    assert "AND checkin.player_id IS NULL" in BRIDGE
    assert "INTERVAL '2 hours'" in BRIDGE
    assert "INTERVAL '10 minutes'" in BRIDGE
    assert "Не прошли чек-ин:" in BRIDGE
    assert "ON CONFLICT DO NOTHING" in BRIDGE
