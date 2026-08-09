"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type SiteBreakStatus = {
  isBreakEnabled: boolean;
  hasOrganizerAccess: boolean;
};

export function SiteBreakWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    let isCancelled = false;
    async function checkSiteBreak() {
      try {
        const response = await fetch("/api/site-break/status", {
          cache: "no-store",
        });
        if (!response.ok || isCancelled) return;
        const status = (await response.json()) as SiteBreakStatus;
        if (
          status.isBreakEnabled &&
          !status.hasOrganizerAccess &&
          pathname !== "/break"
        ) {
          window.location.replace("/break");
        } else if (!status.isBreakEnabled && pathname === "/break") {
          window.location.replace("/");
        }
      } catch {
        // A temporary connection error must not create a redirect loop.
      }
    }
    void checkSiteBreak();
    const interval = window.setInterval(() => void checkSiteBreak(), 3_000);
    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
