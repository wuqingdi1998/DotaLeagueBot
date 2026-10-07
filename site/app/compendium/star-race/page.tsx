import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import {
  starRaceForMoment,
  starRacePhase,
  starRacePrizeDescription,
  STAR_RACE_EXCLUSION_RULES,
  OCTOBER_FIRST_WEEK_RACE_RULES,
  isOctoberFirstRaceWeek,
} from "../model/star-race";
import { CompendiumExclusionNotice } from "../components/CompendiumExclusionNotice";
import { CompendiumLeaderboard } from "../sections/CompendiumLeaderboard";
import { isExcludedFromCompendium } from "../services/participant-access";
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
  if (!user) redirect("/login?returnTo=%2Fcompendium%2Fstar-race");
  if (!user.isAdmin && await isExcludedFromCompendium(user.discordId)) {
    return (
      <PlatformShell user={user}>
        <CompendiumExclusionNotice />
      </PlatformShell>
    );
  }
  const now = new Date();
  const race = starRaceForMoment(now);
  if (!starRacePhase(now, user.isAdmin, race).isDetailsVisible) {
    redirect("/compendium#compendium-star-race");
  }
  const participants = await loadStarRaceLeaderboard(race);
  const rules = isOctoberFirstRaceWeek(race) ? OCTOBER_FIRST_WEEK_RACE_RULES : STAR_RACE_EXCLUSION_RULES;
  return (
    <PlatformShell user={user}>
      <CompendiumLeaderboard
        participants={participants}
        eyebrow={race.dateLabel.toUpperCase()}
        title={race.title}
        description={`${rules.join(" ")} При равенстве звёзд выше располагается участник, выполнивший больше ежедневных заданий гонки. При полном равенстве сайт автоматически бросает 20-гранный кубик до получения однозначного порядка — общих мест в итоге не будет. ${starRacePrizeDescription(race.prizes)}`}
      />
    </PlatformShell>
  );
}
