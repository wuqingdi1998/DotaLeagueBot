"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HeaderNavigationContext } from "./useHeaderNavigation";
import { measureNavigationAnimation, type NavigationAnimationStyle } from "./navigation-animation-geometry";

type NavigationAnimation = {
  id: number;
  href: string;
  label: string;
  isMobile: boolean;
  style: NavigationAnimationStyle;
};

/** Lives in the root layout so a page replacement cannot restart the flame. */
export function HeaderNavigationAnimation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [animation, setAnimation] = useState<NavigationAnimation | null>(null);
  const sequence = useRef(0);
  const overlay = useRef<HTMLDivElement>(null);
  const cancelAnimation = useCallback(() => setAnimation(null), []);
  const beginNavigation = useCallback((link: HTMLAnchorElement) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimation({
      id: ++sequence.current,
      href: link.getAttribute("href") ?? "",
      label: link.textContent ?? "",
      isMobile: Boolean(link.closest(".mobile-navigation")),
      style: measureNavigationAnimation(link),
    });
  }, []);

  useLayoutEffect(() => {
    if (!animation) return;
    let anchor: HTMLAnchorElement | undefined;
    function alignWithLink() {
      const current = [...document.querySelectorAll<HTMLAnchorElement>(".header-navigation-link")]
        .find((link) => link.getAttribute("href") === animation?.href && link.getBoundingClientRect().width > 0);
      if (!current || !overlay.current) return;
      if (anchor !== current) {
        anchor?.removeAttribute("data-navigation-overlay");
        anchor = current;
        anchor.setAttribute("data-navigation-overlay", "true");
      }
      const style = measureNavigationAnimation(current);
      for (const [name, value] of Object.entries(style)) {
        const property = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        overlay.current.style.setProperty(property, String(value));
      }
    }
    alignWithLink();
    // Pages may mount their header after the route's loading placeholder.
    const observer = new MutationObserver(alignWithLink);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", alignWithLink);
    window.addEventListener("scroll", alignWithLink, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", alignWithLink);
      window.removeEventListener("scroll", alignWithLink, true);
      anchor?.removeAttribute("data-navigation-overlay");
    };
  }, [animation, pathname]);

  useLayoutEffect(() => {
    if (!animation) return;
    // Cleanup only: navigation never waits for this timer or animation events.
    const timeout = window.setTimeout(cancelAnimation, 1200);
    return () => window.clearTimeout(timeout);
  }, [animation, cancelAnimation]);

  return (
    <HeaderNavigationContext.Provider value={{ beginNavigation, cancelAnimation, isMobileAnimation: animation?.isMobile ?? false }}>
      {children}
      {animation && (
        <div
          key={animation.id}
          ref={overlay}
          className="header-navigation-animation"
          style={animation.style}
          aria-hidden="true"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) cancelAnimation();
          }}
        >
          <span className="header-navigation-fire"><i /><i /><i /><i /><i /><i /><i /></span>
          <span className="header-navigation-animation-label">{animation.label}</span>
          <span className="header-navigation-animation-fill">
            <span className="header-navigation-animation-label">{animation.label}</span>
          </span>
        </div>
      )}
    </HeaderNavigationContext.Provider>
  );
}
