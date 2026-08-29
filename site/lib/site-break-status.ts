import "server-only";

import { getSession } from "@/lib/auth";
import { isSiteBreakEnabled } from "@/lib/site-break";

export type SiteBreakStatus = {
  isBreakEnabled: boolean;
  hasOrganizerAccess: boolean;
};

export async function loadSiteBreakStatus(): Promise<SiteBreakStatus> {
  const isBreakEnabled = await isSiteBreakEnabled();
  const user = await getSession().catch(() => null);
  return {
    isBreakEnabled,
    hasOrganizerAccess: user?.isAdmin ?? false,
  };
}
