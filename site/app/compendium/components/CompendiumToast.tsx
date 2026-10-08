"use client";

import { createPortal } from "react-dom";

export function CompendiumToast({ message }: { message: string }) {
  if (!message) return null;
  // Escape scrolling challenge cards while retaining the site's current theme.
  return createPortal(
    <div className="compendium-toast" role="status">{message}</div>,
    document.querySelector(".site-shell") ?? document.body,
  );
}
