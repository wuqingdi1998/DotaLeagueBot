import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { PredictionHistory } from "../../admin/PredictionHistory";
import { loadPredictionHistory } from "../../services/prediction-history-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "История прогнозов — Linken's Sphere Esports",
};

export default async function PredictionHistoryPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const days = await loadPredictionHistory();
  return (
    <PlatformShell user={user}>
      <PredictionHistory days={days} />
    </PlatformShell>
  );
}
