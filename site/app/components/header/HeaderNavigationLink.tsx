"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

type HeaderNavigationLinkProps = {
  href: string;
  isActive: boolean;
  children: ReactNode;
  beginNavigation: (href: string, onComplete?: () => void) => () => void;
  onAnimationComplete?: () => void;
};

export function HeaderNavigationLink({
  href,
  isActive,
  children,
  beginNavigation,
  onAnimationComplete,
}: HeaderNavigationLinkProps) {
  const [ignition, setIgnition] = useState(0);
  const completeNavigation = useRef<(() => void) | null>(null);

  function ignite(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    completeNavigation.current = beginNavigation(href, onAnimationComplete);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeNavigation.current();
      completeNavigation.current = null;
      return;
    }
    setIgnition((current) => current + 1);
  }

  return (
    <Link
      className="header-navigation-link"
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-igniting={ignition > 0 || undefined}
      onClick={ignite}
    >
      <span
        key={ignition}
        className="header-navigation-label"
        data-igniting={ignition > 0 || undefined}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          setIgnition(0);
          completeNavigation.current?.();
          completeNavigation.current = null;
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
