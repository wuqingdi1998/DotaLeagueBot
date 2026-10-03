import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumExclusionNotice } from "../components/CompendiumExclusionNotice";
import { CompendiumResults } from "../sections/CompendiumResults";
import { isExcludedFromCompendium } from "../services/participant-access";
import { loadCompendiumResults } from "../services/results-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Результаты Компендиума — Linken's Sphere Esports",
  description: "Итоги Компендиума The International 2026.",
};

export default async function CompendiumResultsPage() {
  const user = await getSession();
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
      <CompendiumResults data={data} currentPlayerId={user.discordId} />
    </PlatformShell>
  );
}
