import { participantViewCookie } from "@/lib/participant-view";

export function setParticipantViewCookie(isEnabled: boolean): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const lifetime = isEnabled ? "; Max-Age=2592000" : "; Max-Age=0";
  document.cookie = `${participantViewCookie}=${isEnabled ? "1" : ""}; Path=/; SameSite=Lax${lifetime}${secure}`;
}
