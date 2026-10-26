import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { loadOctoberClanMembers } from "../services/clan-members";
import { OctoberCompendiumBase } from "../sections/OctoberCompendiumBase";
import { getSeasonTournamentLinks } from "@/app/season/services/season-tournament-links";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `План заданий компендиума №${COMPENDIUM_ARCHIVES.october.number} · Только для организатора`,
  robots: { index: false, follow: false },
};

export default async function OctoberCompendiumBasePage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const [clanMembers, tournamentLinks] = await Promise.all([
    loadOctoberClanMembers(),
    getSeasonTournamentLinks(),
  ]);

  return (
    <PlatformShell user={user}>
      <OctoberCompendiumBase
        clanMembers={clanMembers}
        viewerDiscordId={user.discordId}
        tournamentLinks={tournamentLinks}
      />
    </PlatformShell>
  );
}
