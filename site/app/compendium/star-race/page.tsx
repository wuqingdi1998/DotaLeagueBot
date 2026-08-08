import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { STAR_RACE_PRIZES, starRacePhase } from "../model/star-race";
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
        description={`Звёзды за Испытание Рун не учитываются. При равенстве звёзд выше располагается участник, выполнивший больше ежедневных заданий гонки. При полном равенстве сайт автоматически бросает 20-гранный кубик до получения однозначного порядка — общих мест в итоге не будет. Награда за первое место — ${STAR_RACE_PRIZES[0].title}; за второе — ${STAR_RACE_PRIZES[1].title}.`}
      />
    </PlatformShell>
  );
}
