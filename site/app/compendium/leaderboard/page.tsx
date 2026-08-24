import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { CompendiumLeaderboard } from "../sections/CompendiumLeaderboard";
import { loadCompendiumLeaderboard } from "../services/leaderboard-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Рейтинг Компендиума — Linken's Sphere Esports",
  description: "Рейтинг участников Компендиума по заработанным звёздам.",
};

export default async function CompendiumLeaderboardPage() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/compendium/results");
  const participants = await loadCompendiumLeaderboard();
  return (
    <PlatformShell user={user}>
      <CompendiumLeaderboard participants={participants} />
    </PlatformShell>
  );
}
