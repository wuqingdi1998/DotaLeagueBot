export function staticAvatarUrl(avatarUrl: string): string {
  return avatarUrl
    .replace(/\.gif(?=\?|$)/i, ".png")
    .replace(/([?&]format=)gif(?=&|$)/i, "$1png");
}
