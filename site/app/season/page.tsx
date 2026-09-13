import type { Metadata } from "next";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { moscowDateKey } from "@/lib/moscow-date-time";
import { getSeasonTournamentLinks } from "./services/season-tournament-links";
import { SeasonOverviewPage } from "./sections/SeasonOverviewPage";

export const metadata: Metadata = {
  title: "Сезон – Linken's Sphere Esports",
  description:
    "Формат сезона Linken's Sphere Esports: лига, Кубок лиги, Fastcup и путь в финал.",
};

export default async function SeasonPage() {
  const currentMoscowDate = moscowDateKey();
  const [user, tournamentLinks] = await Promise.all([
    getSession(),
    getSeasonTournamentLinks(),
  ]);

  return (
    <PlatformShell user={user} hasFooter={false}>
      <SeasonOverviewPage
        currentMoscowDate={currentMoscowDate}
        isOrganizer={Boolean(user?.isAdmin)}
        tournamentLinks={tournamentLinks}
      />
    </PlatformShell>
  );
}
