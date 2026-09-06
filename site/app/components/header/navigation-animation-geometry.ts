import type { CSSProperties } from "react";

export type NavigationAnimationStyle = CSSProperties & Record<`--${string}`, string>;

/** Includes the space down to the header border, where the desktop neon sits. */
export function measureNavigationAnimation(link: HTMLAnchorElement): NavigationAnimationStyle {
  const rect = link.getBoundingClientRect();
  const label = link.querySelector<HTMLElement>(".header-navigation-label") ?? link;
  const labelRect = label.getBoundingClientRect();
  const labelStyle = getComputedStyle(label);
  const linkStyle = getComputedStyle(link);
  const stripe = getComputedStyle(link, "::after");
  const bottom = Number.parseFloat(stripe.bottom) || 0;
  const border = Number.parseFloat(linkStyle.borderBottomWidth) || 0;
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height - border - bottom}px`,
    font: labelStyle.font,
    letterSpacing: labelStyle.letterSpacing,
    textAlign: labelStyle.textAlign as CSSProperties["textAlign"],
    whiteSpace: labelStyle.whiteSpace as CSSProperties["whiteSpace"],
    "--navigation-label-left": `${labelRect.left - rect.left}px`,
    "--navigation-label-top": `${labelRect.top - rect.top}px`,
    "--navigation-label-width": `${labelRect.width}px`,
    "--navigation-active": linkStyle.getPropertyValue("--navigation-active"),
    "--muted": linkStyle.getPropertyValue("--muted"),
    "--blue": linkStyle.getPropertyValue("--blue"),
    "--blue-soft": linkStyle.getPropertyValue("--blue-soft"),
  };
}
