"use client";

import { useCallback } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  tournamentTabFromLocation,
  tournamentTabHref,
} from "../model/tournament-route";
import type { TournamentTab } from "../model/types";

export function useTournamentRoute(isAdmin: boolean) {
  const params = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentSlug = params.slug;
  const requestedRound = Number(searchParams.get("round") || 0);
  const manageRequested = searchParams.get("manage") === "1";
  const routeActiveTab = tournamentTabFromLocation(pathname, requestedRound);
  const activeTab = manageRequested && isAdmin ? "admin" : routeActiveTab;

  const setActiveTab = useCallback(
    (tab: TournamentTab) => {
      if (tab !== "round") {
        router.push(tournamentTabHref(tournamentSlug, tab), { scroll: false });
      }
    },
    [router, tournamentSlug],
  );

  return { activeTab, setActiveTab, tournamentSlug };
}
