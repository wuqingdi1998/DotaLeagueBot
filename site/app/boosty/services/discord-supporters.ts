import { supporterRoleId } from "../../../lib/subscription-roles";

export type Supporter = {
  discordId: string;
  name: string;
  avatarUrl: string | null;
};

type DiscordMember = {
  avatar?: string | null;
  nick?: string | null;
  roles?: string[];
  user?: {
    avatar?: string | null;
    bot?: boolean;
    global_name?: string | null;
    id?: string;
    username?: string;
  };
};

const discordPageSize = 1_000;
const maximumDiscordPages = 20;

function discordAvatarUrl(
  guildId: string,
  member: DiscordMember,
): string | null {
  const userId = member.user?.id;
  if (!userId) return null;
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${member.avatar}.webp?size=128`;
  }
  if (member.user?.avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.webp?size=128`;
  }
  return null;
}

function supporterFromDiscordMember(
  guildId: string,
  member: DiscordMember,
): Supporter | null {
  const user = member.user;
  if (
    !user?.id ||
    !user.username ||
    user.bot ||
    !member.roles?.includes(supporterRoleId)
  ) {
    return null;
  }
  return {
    discordId: user.id,
    name: member.nick?.trim() || user.global_name?.trim() || user.username,
    avatarUrl: discordAvatarUrl(guildId, member),
  };
}

export async function loadDiscordSupporters(): Promise<Supporter[] | null> {
  const botToken = (process.env.DISCORD_TOKEN ?? "").trim();
  const guildId = (process.env.GUILD_ID ?? "").trim();
  if (!botToken || !/^\d+$/.test(guildId)) return null;

  try {
    const members: DiscordMember[] = [];
    let after = "0";
    for (let page = 0; page < maximumDiscordPages; page += 1) {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members?limit=${discordPageSize}&after=${after}`,
        {
          headers: { Authorization: `Bot ${botToken}` },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) return null;
      const pageMembers = (await response.json()) as DiscordMember[];
      members.push(...pageMembers);
      if (pageMembers.length < discordPageSize) break;
      const lastId = pageMembers.at(-1)?.user?.id;
      if (!lastId) return null;
      after = lastId;
    }

    return members
      .map((member) => supporterFromDiscordMember(guildId, member))
      .filter((supporter): supporter is Supporter => supporter !== null)
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  } catch {
    return null;
  }
}
