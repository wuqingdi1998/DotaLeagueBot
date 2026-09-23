export type OrganizerAccessMethod = "trusted" | "password" | null;

export function organizerAccessMethod(
  isTrustedOrganizer: boolean,
  hasPasswordSession: boolean,
): OrganizerAccessMethod {
  if (isTrustedOrganizer) return "trusted";
  if (hasPasswordSession) return "password";
  return null;
}

export function requiresFreshOrganizerPassword(
  accessMethod: OrganizerAccessMethod,
): boolean {
  return accessMethod === "password";
}
