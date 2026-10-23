"use client";
import { useSyncExternalStore } from "react";
import { defaultLeagueBackdropId, leagueBackdropById } from "../model/league-backdrops";
const changeEvent = "league-backdrop-preview-change";
const choices = new Map<string, string>();
const defaultSnapshot = () => defaultLeagueBackdropId;
function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  return () => window.removeEventListener(changeEvent, listener);
}
export function useLeagueBackdrop(organizerId: string) {
  const selected = useSyncExternalStore(subscribe, () => choices.get(organizerId) ?? defaultLeagueBackdropId, defaultSnapshot);
  function select(value: string) {
    choices.set(organizerId, leagueBackdropById(value) ? value : "none");
    window.dispatchEvent(new Event(changeEvent));
  }
  return { selected, select };
}
