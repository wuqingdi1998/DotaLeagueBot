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
    const events = new EventSource("/api/site-break/events");
    const receiveStatus = (event: MessageEvent<string>) => {
      const status = JSON.parse(event.data) as SiteBreakStatus;
      if (
        status.isBreakEnabled &&
        !status.hasOrganizerAccess &&
        pathname !== "/break"
      ) {
        window.location.replace("/break");
      } else if (!status.isBreakEnabled && pathname === "/break") {
        window.location.replace("/");
      }
    };
    events.addEventListener("status", receiveStatus as EventListener);
    return () => events.close();
  }, [pathname]);

  return null;
}
