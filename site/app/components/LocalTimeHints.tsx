"use client";

import { useEffect } from "react";
import {
  formatComputerTimeHint,
  moscowRecurringTimeToIso,
} from "@/lib/local-time-hint";

function enhanceTimeElement(element: HTMLTimeElement) {
  const source = element.hasAttribute("data-moscow-recurring-time")
    ? moscowRecurringTimeToIso(element.dateTime)
    : element.dateTime;
  const hint = formatComputerTimeHint(source);
  if (!hint) {
    element.removeAttribute("data-local-time-hint");
    element.removeAttribute("title");
    return;
  }
  element.dataset.localTimeHint = hint;
  element.title = hint;
}

function enhanceTimeElements(root: ParentNode) {
  if (root instanceof HTMLTimeElement && root.matches("time[datetime]")) {
    enhanceTimeElement(root);
  }
  root
    .querySelectorAll<HTMLTimeElement>("time[datetime]")
    .forEach(enhanceTimeElement);
}

export function LocalTimeHints() {
  useEffect(() => {
    enhanceTimeElements(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          if (mutation.target instanceof HTMLTimeElement) {
            enhanceTimeElement(mutation.target);
          }
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) enhanceTimeElements(node);
        });
      }
    });
    observer.observe(document.body, {
      attributeFilter: ["datetime", "data-moscow-recurring-time"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    const recurringTimer = window.setInterval(
      () =>
        document
          .querySelectorAll<HTMLTimeElement>(
            "time[datetime][data-moscow-recurring-time]",
          )
          .forEach(enhanceTimeElement),
      60_000,
    );
    return () => {
      observer.disconnect();
      window.clearInterval(recurringTimer);
    };
  }, []);

  return null;
}
