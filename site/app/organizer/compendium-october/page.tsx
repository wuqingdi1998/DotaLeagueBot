import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { octoberRaceForMoment } from "./model/plan";
import { loadOctoberClanMembers } from "./services/clan-members";
import { OctoberCompendiumPreview } from "./sections/OctoberCompendiumPreview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новый компендиум · Закрытый просмотр",
  robots: { index: false, follow: false },
};

export default async function OctoberCompendiumPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const clanMembers = await loadOctoberClanMembers();

  return (
    <PlatformShell user={user} hasFooter={false}>
      <OctoberCompendiumPreview
        week={octoberRaceForMoment(new Date())}
        clanMembers={clanMembers}
        viewerDiscordId={user.discordId}
      />
    </PlatformShell>
  );
}
