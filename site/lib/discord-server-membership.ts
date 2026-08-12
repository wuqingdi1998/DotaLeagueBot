type DiscordError = {
  code?: unknown;
};

const discordUnknownMemberCode = 10007;

async function isUnknownDiscordMember(response: Response): Promise<boolean> {
  if (response.status !== 404) return false;
  try {
    const error = (await response.json()) as DiscordError;
    return error.code === discordUnknownMemberCode;
  } catch {
    return false;
  }
}

export async function checkDiscordServerMembership(
  discordId: string,
): Promise<boolean | null> {
  const botToken = (process.env.DISCORD_TOKEN ?? "").trim();
  const guildId = (process.env.GUILD_ID ?? "").trim();
  if (!botToken || !/^\d+$/.test(guildId)) return null;

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (response.ok) return true;
    if (await isUnknownDiscordMember(response)) return false;
    return null;
  } catch {
    return null;
  }
}
