"use client";

import { useEffect } from "react";

const SPACE_KEY_DEFAULT_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='checkbox']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='option']",
  "[role='radio']",
  "[role='switch']",
  "[role='textbox']",
].join(", ");

function shouldKeepSpaceKeyDefault(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(SPACE_KEY_DEFAULT_SELECTOR) !== null
  );
}

type SpaceKeyEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "defaultPrevented" | "metaKey"
>;

export function shouldPreventSpaceScroll(
  event: SpaceKeyEvent,
  shouldKeepDefault: boolean,
): boolean {
  return (
    event.code === "Space" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.defaultPrevented &&
    !shouldKeepDefault
  );
}

export function PreventSpaceScroll() {
  useEffect(() => {
    function preventSpaceScroll(event: KeyboardEvent) {
      if (!shouldPreventSpaceScroll(event, shouldKeepSpaceKeyDefault(event.target))) {
        return;
      }

      event.preventDefault();
    }

    window.addEventListener("keydown", preventSpaceScroll, { capture: true });
    return () =>
      window.removeEventListener("keydown", preventSpaceScroll, {
        capture: true,
      });
  }, []);

  return null;
}
