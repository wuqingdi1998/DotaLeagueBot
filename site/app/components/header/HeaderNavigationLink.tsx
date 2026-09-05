"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

type HeaderNavigationLinkProps = {
  href: string;
  isActive: boolean;
  children: ReactNode;
  onAnimationComplete?: () => void;
};

export function HeaderNavigationLink({
  href,
  isActive,
  children,
  onAnimationComplete,
}: HeaderNavigationLinkProps) {
  const [ignition, setIgnition] = useState(0);

  function ignite(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setIgnition((current) => current + 1);
  }

  return (
    <Link
      className="header-navigation-link"
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={ignite}
    >
      <span
        key={ignition}
        className="header-navigation-label"
        data-igniting={ignition > 0 || undefined}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          setIgnition(0);
          onAnimationComplete?.();
        }}
      >
        {children}
        <span className="header-navigation-fire" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i />
        </span>
      </span>
    </Link>
  );
}
