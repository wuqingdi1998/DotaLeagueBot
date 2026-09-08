const compactDiscordAvatarSize = 128;
const discordImageHosts = new Set([
  "cdn.discordapp.com",
  "media.discordapp.net",
]);

function discordAvatarUrl(avatarUrl: string) {
  try {
    const parsed = new URL(avatarUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.port ||
      parsed.username ||
      parsed.password ||
      !discordImageHosts.has(parsed.hostname)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function staticDiscordAvatarUrl(avatarUrl: string) {
  return avatarUrl
    .replace(/\.gif(?=\?|$)/i, ".png")
    .replace(/([?&]format=)gif(?=&|$)/i, "$1png");
}

export function compactDiscordAvatarUrl(avatarUrl: string) {
  const parsed = discordAvatarUrl(avatarUrl);
  if (!parsed) return avatarUrl;
  const staticUrl = new URL(staticDiscordAvatarUrl(parsed.toString()));
  staticUrl.searchParams.set("size", String(compactDiscordAvatarSize));
  return staticUrl.toString();
}

export function discordAvatarCacheKey(avatarUrl: string) {
  const parsed = discordAvatarUrl(avatarUrl);
  if (!parsed) return null;
  const userAvatar = parsed.pathname.match(
    /^\/avatars\/(\d+)\/[A-Za-z0-9_]+\.(?:gif|jpe?g|png|webp)$/i,
  );
  if (userAvatar) return `user-${userAvatar[1]}`;
  const serverAvatar = parsed.pathname.match(
    /^\/guilds\/\d+\/users\/(\d+)\/avatars\/[A-Za-z0-9_]+\.(?:gif|jpe?g|png|webp)$/i,
  );
  if (serverAvatar) return `user-${serverAvatar[1]}`;
  const defaultAvatar = parsed.pathname.match(
    /^\/embed\/avatars\/(\d+)\.(?:gif|jpe?g|png|webp)$/i,
  );
  return defaultAvatar ? `default-${defaultAvatar[1]}` : null;
}

export function resilientAvatarUrl(avatarUrl: string) {
  const compactUrl = compactDiscordAvatarUrl(avatarUrl);
  if (!discordAvatarCacheKey(compactUrl)) return avatarUrl;
  return `/api/discord-avatars?source=${encodeURIComponent(compactUrl)}`;
}
