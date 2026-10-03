"use client";

import { useEffect, useState } from "react";
import { OCTOBER_PUBLIC_LAUNCH_AT } from "@/lib/october-compendium-release";
import { HeaderNavigationLink } from "./HeaderNavigationLink";

type CompendiumNavigationLinkProps = {
  beginNavigation: (link: HTMLAnchorElement) => void;
  isActive: boolean;
  onSelect?: () => void;
};

export function CompendiumNavigationLink({
  beginNavigation,
  isActive,
  onSelect,
}: CompendiumNavigationLinkProps) {
  const [isLaunched, setIsLaunched] = useState(false);

  useEffect(() => {
    const launchAt = Date.parse(OCTOBER_PUBLIC_LAUNCH_AT);
    const showLiveLink = () => setIsLaunched(Date.now() >= launchAt);
    showLiveLink();
    const delay = launchAt - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(showLiveLink, delay + 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isLaunched) {
    return (
      <span
        className="header-navigation-link compendium-navigation-link is-locked"
        aria-disabled="true"
        title="Компендиум откроется 3 октября в 22:30 МСК"
      >
        <span className="header-navigation-label">Компендиум</span>
      </span>
    );
  }

  return (
    <HeaderNavigationLink
      beginNavigation={beginNavigation}
      className="compendium-navigation-link is-live"
      isActive={isActive}
      href="/compendium"
      onSelect={onSelect}
    >
      Компендиум
    </HeaderNavigationLink>
  );
}
