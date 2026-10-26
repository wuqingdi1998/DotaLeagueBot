import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompendiumResults } from "@/app/compendium/sections/CompendiumResults";
import { loadCompendiumResults } from "@/app/compendium/services/results-repository";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Результаты компендиума №${COMPENDIUM_ARCHIVES["ti-2026"].number} – Архив организатора`,
};

export default async function OrganizerCompendiumResultsPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const playerId = user.isStandaloneOrganizer ? undefined : user.discordId;
  const data = await loadCompendiumResults(playerId, "ti-2026");

  return (
    <PlatformShell user={user}>
      <CompendiumResults data={data} currentPlayerId={playerId} />
    </PlatformShell>
  );
}
