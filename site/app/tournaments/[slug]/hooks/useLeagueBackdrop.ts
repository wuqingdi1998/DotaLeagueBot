"use client";
import { useSyncExternalStore } from "react";
import { leagueBackdropById } from "../model/league-backdrops";
const changeEvent = "league-backdrop-preview-change";
const choices = new Map<string, string>();
const defaultSnapshot = () => "1";
function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  return () => window.removeEventListener(changeEvent, listener);
}
export function useLeagueBackdrop(organizerId: string) {
  const selected = useSyncExternalStore(subscribe, () => choices.get(organizerId) ?? "1", defaultSnapshot);
  function select(value: string) {
    choices.set(organizerId, leagueBackdropById(value) ? value : "none");
    window.dispatchEvent(new Event(changeEvent));
  }
  return { selected, select };
}
