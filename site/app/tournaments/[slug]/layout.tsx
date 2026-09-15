import type { ReactNode } from "react";
import { TournamentProvider } from "./hooks/TournamentContext";

export default function TournamentLayout({ children }: { children: ReactNode }) {
  return <TournamentProvider>{children}</TournamentProvider>;
}
