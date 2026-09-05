"use client";

import { useEffect } from "react";
import type { TournamentTab } from "../model/types";

const actionTargetPrefixes = [
  "team-check-in-",
  "season-check-in-",
  "team-invitation-",
];

function scrollToTournamentAction() {
  let targetId = "";
  try {
    targetId = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  if (!actionTargetPrefixes.some((prefix) => targetId.startsWith(prefix))) {
    return;
  }
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.focus({ preventScroll: true });
}

export function useTournamentActionTarget({
  activeTab,
  readyKey,
  setActiveTab,
}: {
  activeTab: TournamentTab;
  readyKey: string;
  setActiveTab: (tab: TournamentTab) => void;
}): void {
  useEffect(() => {
    const openTournamentAction = () => {
      if (
        window.location.hash.startsWith("#team-check-in-") &&
        activeTab !== "overview"
      ) {
        setActiveTab("overview");
        return;
      }
      scrollToTournamentAction();
    };
    const animationFrame = window.requestAnimationFrame(openTournamentAction);
    window.addEventListener("hashchange", openTournamentAction);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("hashchange", openTournamentAction);
    };
  }, [activeTab, readyKey, setActiveTab]);
}
