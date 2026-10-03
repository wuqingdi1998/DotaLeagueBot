import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import {
  octoberCompendiumPhase,
  octoberDailyRewardStars,
  OCTOBER_CLAN_FORMATION_AT,
  OCTOBER_CLAN_PUBLICATION_AT,
} from "@/lib/october-compendium-release";
import { currentMoscowDay } from "./model/time";
import { octoberRaceForMoment } from "@/app/organizer/compendium-october/model/plan";
import { OctoberCompendiumPreview } from "@/app/organizer/compendium-october/sections/OctoberCompendiumPreview";
import { loadOctoberClanMembers } from "@/app/organizer/compendium-october/services/clan-members";
import { loadOctoberClanReservationState } from "@/app/organizer/compendium-october/services/clan-reservations";
import { loadOctoberFormationStatus } from "@/app/organizer/compendium-october/services/clan-formation-repository";
import { OctoberReleaseRefresh } from "@/app/organizer/compendium-october/components/OctoberReleaseRefresh";
import { getSeasonTournamentLinks } from "@/app/season/services/season-tournament-links";
import { CompendiumExclusionNotice } from "./components/CompendiumExclusionNotice";
import { isExcludedFromCompendium } from "./services/participant-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Компендиум · Сезон 9",
  description: "Клановый Компендиум Linken's Sphere Esports с заданиями, наградами и гонкой за звёздами.",
};

export default async function CompendiumPage() {
  const now = new Date();
  const scheduledPhase = octoberCompendiumPhase(now);
  const user = await getSession();
  if (!user || user.isStandaloneOrganizer) {
    redirect("/login?returnTo=%2Fcompendium");
  }
  if (scheduledPhase === "hidden") redirect("/compendium/results");
  if (await isExcludedFromCompendium(user.discordId)) {
    return (
      <PlatformShell user={user} hasFooter={false}>
        <CompendiumExclusionNotice />
      </PlatformShell>
    );
  }
  const formationStatus = await loadOctoberFormationStatus();
  const visiblePhase = scheduledPhase === "published" && formationStatus !== "complete"
    ? "formation"
    : scheduledPhase;
  const [clanMembers, loadedReservation, tournamentLinks] = await Promise.all([
    loadOctoberClanMembers(now),
    loadOctoberClanReservationState(user, now),
    getSeasonTournamentLinks(),
  ]);
  const reservation = { ...loadedReservation, phase: visiblePhase };
  const moscowDate = currentMoscowDay(now).dateKey;
  const nextTransitionAt = visiblePhase === "reservation"
    ? OCTOBER_CLAN_FORMATION_AT
    : visiblePhase === "formation"
      ? OCTOBER_CLAN_PUBLICATION_AT
      : null;

  return (
    <PlatformShell user={user} hasFooter={false}>
      <OctoberReleaseRefresh nextTransitionAt={nextTransitionAt} />
      <OctoberCompendiumPreview
        week={octoberRaceForMoment(now)}
        clanMembers={clanMembers}
        viewerDiscordId={user.discordId}
        personalStars={0}
        reservation={reservation}
        areDailyQuestsOpen={scheduledPhase === "published" && formationStatus === "complete"}
        dailyRewardStars={octoberDailyRewardStars(moscowDate)}
        isOrganizer={user?.isAdmin === true}
        tournamentLinks={tournamentLinks}
      />
    </PlatformShell>
  );
}
