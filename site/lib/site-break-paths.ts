const siteBreakBypassPaths = new Set([
  "/break",
  "/api/health",
  "/api/site-break/events",
  "/api/site-break/status",
  "/api/auth/discord",
  "/api/auth/callback",
  "/api/auth/organizer",
  "/api/auth/logout",
  "/api/internal/compendium/verification-retries",
]);

export function isSiteBreakBypassPath(pathname: string): boolean {
  return siteBreakBypassPaths.has(pathname);
}
