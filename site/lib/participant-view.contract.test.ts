import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("organizer participant view boundaries", () => {
  it("applies the viewing preference before page and API permissions", () => {
    const auth = source("lib/auth.ts");
    expect(auth).toContain("return sessionForParticipantView({");
    expect(auth).toContain("const user = await getSession()");
    expect(auth).toContain("if (!user.isAdmin)");
    expect(auth).toContain("cookieStore.delete(participantViewCookie)");
  });

  it("also treats the organizer as a visitor during a site break", () => {
    const proxy = source("proxy.ts");
    const breakPage = source("app/break/page.tsx");
    expect(proxy).toContain("!isParticipantViewEnabled(request.cookies.get(participantViewCookie)?.value)");
    expect(breakPage).toContain("user?.isParticipantView");
    expect(breakPage).toContain("<ParticipantViewToggle isEnabled />");
  });

  it("shows the switch only to an account with organizer access", () => {
    const header = source("app/components/SiteHeader.tsx");
    expect(header).toContain("user.hasOrganizerAccess && (");
    expect(header).toContain("<ParticipantViewToggle isEnabled={Boolean(user.isParticipantView)} />");
  });
});
