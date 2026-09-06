"use client";

import { type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

type HeaderNavigationLinkProps = {
  href: string;
  isActive: boolean;
  children: ReactNode;
  beginNavigation: (link: HTMLAnchorElement) => void;
  onSelect?: () => void;
};

export function HeaderNavigationLink({
  href,
  isActive,
  children,
  beginNavigation,
  onSelect,
}: HeaderNavigationLinkProps) {
  function ignite(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    beginNavigation(event.currentTarget);
    onSelect?.();
  }

  return (
    <Link
      className="header-navigation-link"
      href={href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      onClick={ignite}
    >
      <span className="header-navigation-label">{children}</span>
    </Link>
  );
}
