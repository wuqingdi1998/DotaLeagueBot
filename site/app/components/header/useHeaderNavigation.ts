"use client";

import { createContext, useContext } from "react";

type HeaderNavigationContextValue = {
  beginNavigation: (link: HTMLAnchorElement) => void;
  cancelAnimation: () => void;
  isMobileAnimation: boolean;
};

export const HeaderNavigationContext = createContext<HeaderNavigationContextValue>({
  beginNavigation: () => {},
  cancelAnimation: () => {},
  isMobileAnimation: false,
});

/** Shares only the temporary visual effect, never page data or navigation. */
export function useHeaderNavigation() {
  return useContext(HeaderNavigationContext);
}
