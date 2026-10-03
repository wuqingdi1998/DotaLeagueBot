import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { octoberRaceForMoment } from "./model/plan";
import { loadOctoberClanMembers } from "./services/clan-members";
import { OctoberPreviewProfileActions } from "./components/OctoberPreviewProfileActions";
import {
  OCTOBER_PREVIEW_MAXIMUM_STARS,
  OCTOBER_PREVIEW_STARTED_PARAM,
  OCTOBER_PREVIEW_STARS_PARAM,
  octoberPreviewStarted,
  octoberPreviewStars,
} from "./model/preview-settings";
import { OctoberCompendiumPreview } from "./sections/OctoberCompendiumPreview";
import { loadOctoberClanReservationState } from "./services/clan-reservations";
import { currentMoscowDay } from "@/app/compendium/model/time";
import { octoberCompendiumPhase, octoberDailyRewardStars } from "./model/release";
import { octoberReservationForStartedPreview } from "./model/clan-reservation";
import { getSeasonTournamentLinks } from "@/app/season/services/season-tournament-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новый компендиум · Предпросмотр",
  robots: { index: false, follow: false },
};
export default async function OctoberCompendiumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const query = await searchParams;
  const now = new Date();
  const scheduledPhase = octoberCompendiumPhase(now);
  const personalStars = octoberPreviewStars(query[OCTOBER_PREVIEW_STARS_PARAM]);
  const isTournamentStarted = octoberPreviewStarted(
    query[OCTOBER_PREVIEW_STARTED_PARAM],
    scheduledPhase === "published",
  );
  const [clanMembers, reservation, tournamentLinks] = await Promise.all([
    loadOctoberClanMembers(now),
    loadOctoberClanReservationState(user, now),
    getSeasonTournamentLinks(),
  ]);

  return (
    <PlatformShell
      user={user}
      hasFooter={false}
      profileMenuExtras={(
        <OctoberPreviewProfileActions
          isMaximumStarsEnabled={personalStars === OCTOBER_PREVIEW_MAXIMUM_STARS}
          isTournamentStarted={isTournamentStarted}
        />
      )}
    >
      <OctoberCompendiumPreview
        week={octoberRaceForMoment(now)}
        clanMembers={clanMembers}
        viewerDiscordId={user.discordId}
        personalStars={personalStars}
        reservation={octoberReservationForStartedPreview(reservation, isTournamentStarted)}
        areDailyQuestsOpen={isTournamentStarted}
        dailyRewardStars={octoberDailyRewardStars(currentMoscowDay(now).dateKey)}
        isOrganizerPreview
        isOrganizer
        tournamentLinks={tournamentLinks}
      />
    </PlatformShell>
  );
}
