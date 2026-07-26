from cogs.admin import Admin, BRAND_EMBED_COLOR, build_announcement_embed


def test_announcement_embed_uses_brand_color():
    embed = build_announcement_embed("Заголовок", "Текст")

    assert embed.title == "Заголовок"
    assert embed.description == "Текст"
    assert embed.color.value == BRAND_EMBED_COLOR
    assert BRAND_EMBED_COLOR == 0x00C3FF


def test_say_embed_command_is_registered():
    assert Admin.say_embed.name == "say_embed"
    assert Admin.say_embed.default_permissions is None
