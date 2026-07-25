import discord


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
