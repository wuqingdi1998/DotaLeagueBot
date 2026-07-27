"use client";

import { createContext, ReactNode, useContext } from "react";
import {
  TournamentController,
  useTournamentController,
} from "./useTournamentController";

const TournamentContext = createContext<TournamentController | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const controller = useTournamentController();

  return (
    <TournamentContext.Provider value={controller}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const controller = useContext(TournamentContext);
  if (!controller) {
    throw new Error("useTournament должен использоваться внутри TournamentProvider");
  }
  return controller;
}
