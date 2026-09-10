import Link from "next/link";
import { FiArrowRight, FiCalendar } from "react-icons/fi";
import { SeasonTournamentLinkEditor } from "../admin/SeasonTournamentLinkEditor";
import { LeagueOverviewCard } from "../components/LeagueOverviewCard";
import { LeagueCupOverviewCard } from "../components/LeagueCupOverviewCard";
import {
  leagueOverview,
  leagueCupOverview,
  seasonIntroduction,
  seasonPeriod,
  type SeasonTournamentLinks,
} from "../model/season-overview-model";
import { FastCupsOverview } from "./FastCupsOverview";

type SeasonOverviewPageProps = {
  isOrganizer: boolean;
  tournamentLinks: SeasonTournamentLinks;
};

export function SeasonOverviewPage({
  isOrganizer,
  tournamentLinks,
}: SeasonOverviewPageProps) {
  const leagueCupHref =
    tournamentLinks[leagueCupOverview.linkId] ??
    leagueCupOverview.tournamentHref;

  return (
    <section className="season-overview" aria-labelledby="season-title">
      <header className="season-overview-heading">
        <div className="season-overview-copy">
          <p className="eyebrow">Linken&apos;s Sphere Esports</p>
          <div className="season-overview-title-row">
            <h1 id="season-title">Сезон</h1>
            <span>{seasonPeriod}</span>
            <Link
              className="season-title-calendar-link"
              href={leagueOverview.calendarHref}
            >
              <FiCalendar aria-hidden="true" />
              Смотреть календарь
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p>{seasonIntroduction}</p>
        </div>
      </header>

      <div className="season-primary-grid">
        <LeagueOverviewCard />
        <LeagueCupOverviewCard
          tournamentHref={leagueCupHref}
          linkEditor={
            isOrganizer && !leagueCupHref ? (
              <SeasonTournamentLinkEditor
                linkId={leagueCupOverview.linkId}
                tournamentTitle={leagueCupOverview.title}
              />
            ) : undefined
          }
        />
      </div>
      <FastCupsOverview
        isOrganizer={isOrganizer}
        tournamentLinks={tournamentLinks}
      />
    </section>
  );
}
