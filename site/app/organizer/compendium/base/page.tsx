import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumBase } from "@/app/compendium/admin/CompendiumBase";
import { loadCompendiumAdminParticipants } from "@/app/compendium/admin/repository";
import { loadCompendiumStarRaceArchive } from "@/app/compendium/admin/star-race-archive-repository";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `База компендиума №${COMPENDIUM_ARCHIVES["ti-2026"].number} – Архив организатора` };

export default async function ArchivedCompendiumBasePage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const [participants, starRaceArchive] = await Promise.all([
    loadCompendiumAdminParticipants("ti-2026"),
    loadCompendiumStarRaceArchive(new Date(), "ti-2026"),
  ]);
  return <PlatformShell user={user}>
    <CompendiumBase participants={participants} starRaceArchive={starRaceArchive} period="ti-2026" />
  </PlatformShell>;
}
