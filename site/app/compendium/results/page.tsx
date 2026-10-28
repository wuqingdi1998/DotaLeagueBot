import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumExclusionNotice } from "../components/CompendiumExclusionNotice";
import { CompendiumResults } from "../sections/CompendiumResults";
import { isExcludedFromCompendium } from "../services/participant-access";
import { loadCompendiumResults } from "../services/results-repository";
import { CompendiumClosingRefresh } from "../components/CompendiumClosingRefresh";
import { OctoberReleaseRefresh } from "@/app/organizer/compendium-october/components/OctoberReleaseRefresh";
import { OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";
import { OCTOBER_RESULTS_ARCHIVE_AT } from "@/lib/october-compendium-schedule";
import { archivedCompendiumDestination } from "../model/public-results-access";
import { COMPENDIUM_ARCHIVES } from "../model/archive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Результаты Компендиума — Linken's Sphere Esports",
  description: "Результаты октябрьского компендиума сезона 9.",
};

export default async function CompendiumResultsPage() {
  const now = new Date();
  const user = await getSession();
  const archiveDestination = archivedCompendiumDestination(user?.isAdmin === true, now);
  if (archiveDestination) redirect(archiveDestination);
  if (!user || user.isStandaloneOrganizer) {
    redirect("/login?returnTo=%2Fcompendium%2Fresults");
  }
  if (await isExcludedFromCompendium(user.discordId)) {
    return (
      <PlatformShell user={user}>
        <CompendiumExclusionNotice />
      </PlatformShell>
    );
  }
  const data = await loadCompendiumResults(user.discordId);
  return (
    <PlatformShell user={user}>
      <CompendiumClosingRefresh isWaiting={data.closure === "settling"} />
      <OctoberReleaseRefresh nextTransitionAt={data.closure === "active" ? OCTOBER_COMPENDIUM_END_AT : null} />
      <CompendiumResults data={data} currentPlayerId={user.discordId} availability={{
        serverNow: now.toISOString(), archiveAt: OCTOBER_RESULTS_ARCHIVE_AT,
        archiveHref: user.isAdmin ? COMPENDIUM_ARCHIVES.october.resultsHref : "/",
      }} />
    </PlatformShell>
  );
}
