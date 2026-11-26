const developerDiscordIds: readonly string[] = ["311247030422863882"];

export function hasDeveloperAccess(user: { discordId: string; isAdmin: boolean } | null | undefined): boolean {
  return user?.isAdmin === true && developerDiscordIds.includes(user.discordId);
}
