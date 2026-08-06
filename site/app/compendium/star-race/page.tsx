import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { starRacePhase } from "../model/star-race";
import { CompendiumLeaderboard } from "../sections/CompendiumLeaderboard";
import { loadStarRaceLeaderboard } from "../services/star-race-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Гонка за звёздами — Linken's Sphere Esports",
  description: "Недельный рейтинг участников Компендиума за 10–16 августа.",
};

export default async function StarRaceLeaderboardPage() {
  const user = await getSession();
  if (!user) {
    redirect("/api/auth/discord?returnTo=%2Fcompendium%2Fstar-race");
  }
  if (!starRacePhase(new Date(), user.isAdmin).isDetailsVisible) {
    redirect("/compendium#compendium-star-race");
  }
  const participants = await loadStarRaceLeaderboard();
  return (
    <PlatformShell user={user}>
      <CompendiumLeaderboard
        participants={participants}
        eyebrow="10–16 АВГУСТА 2026"
        title="Гонка за звёздами"
        description="Звёзды, полученные всеми способами только за неделю гонки. Награда за первое место — сет Primeval Abomination на Primal Beast."
      />
    </PlatformShell>
  );
}
