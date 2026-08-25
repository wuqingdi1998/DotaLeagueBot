const compactDiscordAvatarSize = 128;
const discordImageHosts = new Set([
  "cdn.discordapp.com",
  "media.discordapp.net",
]);

export function staticDiscordAvatarUrl(avatarUrl: string) {
  return avatarUrl
    .replace(/\.gif(?=\?|$)/i, ".png")
    .replace(/([?&]format=)gif(?=&|$)/i, "$1png");
}

export function compactDiscordAvatarUrl(avatarUrl: string) {
  try {
    const parsed = new URL(avatarUrl);
    if (!discordImageHosts.has(parsed.hostname)) return avatarUrl;
    const staticUrl = new URL(staticDiscordAvatarUrl(parsed.toString()));
    staticUrl.searchParams.set("size", String(compactDiscordAvatarSize));
    return staticUrl.toString();
  } catch {
    return avatarUrl;
  }
}
