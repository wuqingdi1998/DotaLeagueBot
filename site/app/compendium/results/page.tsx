import type { Metadata } from "next";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumResults } from "../sections/CompendiumResults";
import { loadCompendiumResults } from "../services/results-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Результаты Компендиума — Linken's Sphere Esports",
  description: "Итоги Компендиума The International 2026.",
};

export default async function CompendiumResultsPage() {
  const user = await getSession();
  const data = await loadCompendiumResults(user?.discordId);
  return (
    <PlatformShell user={user}>
      <CompendiumResults data={data} currentPlayerId={user?.discordId} />
    </PlatformShell>
  );
}
