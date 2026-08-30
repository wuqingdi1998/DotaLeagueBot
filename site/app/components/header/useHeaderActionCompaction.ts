"use client";

import { useLayoutEffect, useRef } from "react";

const desktopNavigationQuery = "(min-width: 1051px)";

export function useHeaderActionCompaction() {
  const headerRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const navigation = navigationRef.current;
    const actions = actionsRef.current;
    if (!header || !navigation || !actions) return;

    const desktopNavigation = window.matchMedia(desktopNavigationQuery);
    let isDisposed = false;

    function actionsOverlapNavigation() {
      const firstVisibleAction = actions?.querySelector<HTMLElement>(
        ".boosty-button",
      );
      if (!navigation || !firstVisibleAction) return false;

      const navigationRect = navigation.getBoundingClientRect();
      const actionRect = firstVisibleAction.getBoundingClientRect();
      return navigationRect.right > actionRect.left;
    }

    function updateCompaction() {
      if (!actions) return;

      delete actions.dataset.compactBoosty;
      delete actions.dataset.compactProfile;

      if (!desktopNavigation.matches || !actionsOverlapNavigation()) return;

      actions.dataset.compactBoosty = "true";
      if (!actionsOverlapNavigation()) return;

      actions.dataset.compactProfile = "true";
    }

    updateCompaction();

    const headerResizeObserver = new ResizeObserver(updateCompaction);
    headerResizeObserver.observe(header);
    window.addEventListener("resize", updateCompaction);
    desktopNavigation.addEventListener("change", updateCompaction);
    document.fonts.ready.then(() => {
      if (!isDisposed) updateCompaction();
    });

    return () => {
      isDisposed = true;
      headerResizeObserver.disconnect();
      window.removeEventListener("resize", updateCompaction);
      desktopNavigation.removeEventListener("change", updateCompaction);
    };
  }, []);

  return { actionsRef, headerRef, navigationRef };
}
