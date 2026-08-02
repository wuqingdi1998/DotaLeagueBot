import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { moscowDateKey } from "../model/time";
import { compendiumTeams } from "../model/teams";
import { PredictionAdmin } from "../admin/PredictionAdmin";
import { loadPredictionAdminMatches } from "../services/prediction-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Прогнозы Компендиума — Linken's Sphere Esports",
};

function tomorrowDateKey(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1_000);
  return moscowDateKey(tomorrow);
}

export default async function PredictionAdminPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const now = new Date();
  const matches = await loadPredictionAdminMatches(now);
  const teams = compendiumTeams.map(({ key, name }) => ({ key, name }));
  return (
    <PlatformShell user={user}>
      <PredictionAdmin
        initialMatches={matches}
        teams={teams}
        minimumDate={tomorrowDateKey()}
        nowIso={now.toISOString()}
      />
    </PlatformShell>
  );
}

