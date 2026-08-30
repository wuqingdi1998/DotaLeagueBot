import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompendiumResults } from "@/app/compendium/sections/CompendiumResults";
import { loadCompendiumResults } from "@/app/compendium/services/results-repository";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Результаты компендиума — Архив организатора",
};

export default async function OrganizerCompendiumResultsPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const data = await loadCompendiumResults(user.discordId);

  return (
    <PlatformShell user={user}>
      <CompendiumResults data={data} currentPlayerId={user.discordId} />
    </PlatformShell>
  );
}
