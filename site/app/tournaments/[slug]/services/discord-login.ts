export function startDiscordLogin(returnTo?: string) {
  const destination =
    returnTo ?? `${window.location.pathname}${window.location.search}`;
  window.location.assign(
    `/api/auth/discord?returnTo=${encodeURIComponent(destination)}`,
  );
}
