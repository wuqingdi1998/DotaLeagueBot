"use client";

import { TournamentProvider } from "./hooks/TournamentContext";
import { TournamentPageView } from "./TournamentPageView";

export default function TournamentPage() {
  return (
    <TournamentProvider>
      <TournamentPageView />
    </TournamentProvider>
  );
}
