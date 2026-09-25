import type { OrganizerAccessMethod } from "@/lib/organizer-access";

export const participantViewCookie = "ls_participant_view";

export function isParticipantViewEnabled(value: string | null | undefined): boolean {
  return value === "1";
}

export function sessionForParticipantView<T extends {
  isAdmin: boolean;
  organizerAccess: OrganizerAccessMethod;
}>(user: T, cookieValue: string | null | undefined): T & {
  hasOrganizerAccess: boolean;
  isParticipantView: boolean;
} {
  const hasOrganizerAccess = user.organizerAccess !== null;
  const isParticipantView = hasOrganizerAccess && isParticipantViewEnabled(cookieValue);
  return {
    ...user,
    isAdmin: user.isAdmin && !isParticipantView,
    organizerAccess: isParticipantView ? null : user.organizerAccess,
    hasOrganizerAccess,
    isParticipantView,
  };
}
