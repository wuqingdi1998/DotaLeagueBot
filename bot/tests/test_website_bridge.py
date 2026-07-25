from utils.website_notifications import notification_embed


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
