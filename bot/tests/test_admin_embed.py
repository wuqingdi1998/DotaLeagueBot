from cogs.admin import Admin, BRAND_EMBED_COLOR, build_announcement_embed


def test_announcement_embed_uses_brand_color():
    embed = build_announcement_embed("Заголовок", "Текст")

    assert embed.title == "Заголовок"
    assert embed.description == "Текст"
    assert embed.color.value == BRAND_EMBED_COLOR
    assert BRAND_EMBED_COLOR == 0x00C3FF


def test_announcement_embed_allows_no_title():
    embed = build_announcement_embed(None, "Только основной текст")

    assert embed.title is None
    assert embed.description == "Только основной текст"
    assert embed.color.value == BRAND_EMBED_COLOR


def test_say_embed_command_is_registered():
    assert Admin.say_embed.name == "say_embed"
    assert Admin.say_embed.default_permissions is None
    title_parameter = Admin.say_embed.get_parameter("title")
    assert title_parameter is not None
    assert title_parameter.required is False
