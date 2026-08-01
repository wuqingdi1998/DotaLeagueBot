import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumBase } from "../admin/CompendiumBase";
import { loadCompendiumAdminParticipants } from "../admin/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "База компендиума — Linken's Sphere Esports",
};

export default async function CompendiumBasePage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const participants = await loadCompendiumAdminParticipants();

  return (
    <PlatformShell user={user}>
      <CompendiumBase participants={participants} />
    </PlatformShell>
  );
}
