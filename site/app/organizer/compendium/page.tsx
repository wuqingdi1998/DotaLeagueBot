import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { loadArchivedCompendium } from "./services/archive-repository";
import { ArchivedCompendium } from "./sections/ArchivedCompendium";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Компендиум №${COMPENDIUM_ARCHIVES["ti-2026"].number} – Архив организатора` };

export default async function OrganizerCompendiumPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const data = await loadArchivedCompendium(user.discordId);
  return <PlatformShell user={user}><ArchivedCompendium {...data} /></PlatformShell>;
}
