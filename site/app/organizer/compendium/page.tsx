import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumDashboard } from "@/app/compendium/sections/CompendiumDashboard";
import { loadCompendium } from "@/app/compendium/services/compendium";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Компендиум — Архив организатора",
};

export default async function OrganizerCompendiumPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const data = await loadCompendium(user);

  return (
    <PlatformShell user={user}>
      <CompendiumDashboard
        key={data.moscowDate}
        initialData={data}
        isOrganizer
      />
    </PlatformShell>
  );
}
