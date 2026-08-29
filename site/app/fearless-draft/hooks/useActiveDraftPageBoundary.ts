"use client";

import { useEffect } from "react";

const ACTIVE_DRAFT_DOCUMENT_CLASS = "fearless-active-draft-document";

/** Ends the host page at the active draft while preserving normal page scrolling. */
export function useActiveDraftPageBoundary(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;
    document.body.classList.add(ACTIVE_DRAFT_DOCUMENT_CLASS);
    return () => {
      document.body.classList.remove(ACTIVE_DRAFT_DOCUMENT_CLASS);
    };
  }, [isActive]);
}
