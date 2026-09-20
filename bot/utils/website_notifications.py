import discord


MEMBER_WELCOME_PREVIEW_EVENT_TYPE = "member_welcome_preview"
SEASON_ROUND_ANNOUNCEMENT_PREVIEW_EVENT_TYPE = (
    "season_round_announcement_preview"
)
REGISTRATION_CHANNEL_URL = (
    "https://discord.com/channels/328205360466755584/1457019432034504776"
)
COMMUNITY_SITE_URL = "https://lsesports.ru/"
ADMINISTRATOR_ID = 311247030422863882
ADMINISTRATOR_MENTION = f"<@{ADMINISTRATOR_ID}>"


def member_welcome_embed() -> discord.Embed:
    message = (
        "Ты зашёл на сервер Linken's Sphere Esports – это площадка для любительских "
        "турниров для игроков различных рангов.\n\n"
        "Для участия в наших ивентах нужно зарегистрироваться через "
        f"[канал регистрации]({REGISTRATION_CHANNEL_URL}).\n"
        "Основная информация о турнирах и регистрация – на "
        f"[нашем сайте]({COMMUNITY_SITE_URL}).\n"
        "По любым вопросам, касающимся сервера, можно написать администратору – "
        f"{ADMINISTRATOR_MENTION}."
    )
    return notification_embed("Привет!", message, None)


def notification_embed(
    title: str, message: str, action_url: str | None
) -> discord.Embed:
    embed = discord.Embed(
        title=title,
        description=message,
        color=discord.Color.from_rgb(0, 195, 255),
    )
    if action_url:
        embed.add_field(name="Открыть сайт", value=action_url, inline=False)
    embed.set_footer(text="Linken's Sphere Esports")
    return embed


def notification_outbox_embed(
    event_type: str,
    title: str,
    message: str,
    action_url: str | None,
) -> discord.Embed:
    if event_type == MEMBER_WELCOME_PREVIEW_EVENT_TYPE:
        return member_welcome_embed()
    return notification_embed(title, message, action_url)


def notification_outbox_message_kwargs(
    event_type: str,
    title: str,
    message: str,
    action_url: str | None,
) -> dict[str, object]:
    if event_type == SEASON_ROUND_ANNOUNCEMENT_PREVIEW_EVENT_TYPE:
        return {"content": message}
    return {
        "embed": notification_outbox_embed(
            event_type,
            title,
            message,
            action_url,
        )
    }
