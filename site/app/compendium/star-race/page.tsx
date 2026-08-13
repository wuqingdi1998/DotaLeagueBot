import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import {
  starRaceForMoment,
  starRacePhase,
  starRacePrizeDescription,
} from "../model/star-race";
import { CompendiumLeaderboard } from "../sections/CompendiumLeaderboard";
import { loadStarRaceLeaderboard } from "../services/star-race-repository";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const race = starRaceForMoment(new Date());
  return {
    title: `${race.title} — Linken's Sphere Esports`,
    description: `Недельный рейтинг участников Компендиума за ${race.dateLabel}.`,
  };
}

export default async function StarRaceLeaderboardPage() {
  const user = await getSession();
  if (!user) {
    redirect("/api/auth/discord?returnTo=%2Fcompendium%2Fstar-race");
  }
  const now = new Date();
  const race = starRaceForMoment(now);
  if (!starRacePhase(now, user.isAdmin, race).isDetailsVisible) {
    redirect("/compendium#compendium-star-race");
  }
  const participants = await loadStarRaceLeaderboard(race);
  return (
    <PlatformShell user={user}>
      <CompendiumLeaderboard
        participants={participants}
        eyebrow={race.dateLabel.toUpperCase()}
        title={race.title}
        description={`Звёзды за Испытание Рун не учитываются. При равенстве звёзд выше располагается участник, выполнивший больше ежедневных заданий гонки. При полном равенстве сайт автоматически бросает 20-гранный кубик до получения однозначного порядка — общих мест в итоге не будет. ${starRacePrizeDescription(race.prizes)}`}
      />
    </PlatformShell>
  );
}
