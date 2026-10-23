"use client";
import { useLeagueBackdrop } from "../hooks/useLeagueBackdrop";
import { leagueBackdropById } from "../model/league-backdrops";
export function LeagueBackdrop({ organizerId = "public", variantId }: { organizerId?: string; variantId?: string }) {
  const { selected } = useLeagueBackdrop(organizerId);
  const option = leagueBackdropById(variantId ?? selected);
  return option ? <div className="league-backdrop" aria-hidden="true" style={{ backgroundImage: option.backgroundImage }} /> : null;
}
