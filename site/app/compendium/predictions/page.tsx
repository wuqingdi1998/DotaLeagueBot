import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { moscowDateKey } from "../model/time";
import { compendiumTeams } from "../model/teams";
import { PredictionAdmin } from "../admin/PredictionAdmin";
import { loadPredictionAdminMatches } from "../services/prediction-repository";
import { loadFinalPrediction } from "../services/star-race-final-prediction-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Прогнозы Компендиума — Linken's Sphere Esports",
};

export default async function PredictionAdminPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const now = new Date();
  const [matches, finalPrediction] = await Promise.all([
    loadPredictionAdminMatches(now),
    loadFinalPrediction(),
  ]);
  const teams = compendiumTeams.map(({ key, name }) => ({ key, name }));
  return (
    <PlatformShell user={user}>
      <PredictionAdmin
        initialMatches={matches}
        teams={teams}
        initialDate={moscowDateKey(now)}
        initialFinalPrediction={finalPrediction}
      />
    </PlatformShell>
  );
}
