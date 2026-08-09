export type SiteBreakDecision = "allow" | "show-break" | "block-api";

export function decideSiteBreakAccess(input: {
  isBreakEnabled: boolean;
  hasOrganizerAccess: boolean;
  isApiRequest: boolean;
}): SiteBreakDecision {
  if (!input.isBreakEnabled || input.hasOrganizerAccess) return "allow";
  return input.isApiRequest ? "block-api" : "show-break";
}
