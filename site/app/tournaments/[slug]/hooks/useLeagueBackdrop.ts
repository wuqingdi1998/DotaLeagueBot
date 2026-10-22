"use client";

import { useSyncExternalStore } from "react";
import { leagueBackdropById } from "../model/league-backdrops";
const changeEvent = "league-backdrop-preview-change";
const memory = new Map<string, string>();
const serverSnapshot = () => "none";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}
export function useLeagueBackdrop(organizerId: string) {
  const key = `league-season-9:backdrop:${organizerId}`;
  const selected = useSyncExternalStore(subscribe, () => {
    let value = memory.get(key) ?? "none";
    try { value = localStorage.getItem(key) ?? value; } catch { /* Storage can be disabled by the browser. */ }
    return leagueBackdropById(value) ? value : "none";
  }, serverSnapshot);
  function select(value: string) {
    const next = leagueBackdropById(value) ? value : "none";
    memory.set(key, next);
    try { localStorage.setItem(key, next); } catch { /* Keep the choice for this browser session. */ }
    window.dispatchEvent(new Event(changeEvent));
  }
  return { selected, select };
}
