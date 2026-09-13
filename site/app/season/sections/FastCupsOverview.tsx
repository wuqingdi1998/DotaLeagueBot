import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { SeasonTournamentLinkEditor } from "../admin/SeasonTournamentLinkEditor";
import { FastCupCard } from "../components/FastCupCard";
import { FastCupCarousel } from "../components/FastCupCarousel";
import {
  fastCupIntroduction,
  fastCupOverviews,
  selectFeaturedFastCup,
  type SeasonTournamentLinks,
} from "../model/season-overview-model";

type FastCupsOverviewProps = {
  currentMoscowDate: string;
  isOrganizer: boolean;
  tournamentLinks: SeasonTournamentLinks;
};

export function FastCupsOverview({
  currentMoscowDate,
  isOrganizer,
  tournamentLinks,
}: FastCupsOverviewProps) {
  const featuredFastCup = selectFeaturedFastCup(currentMoscowDate);
  const targetIndex = featuredFastCup
    ? Math.max(0, fastCupOverviews.indexOf(featuredFastCup))
    : 0;

  return (
    <section className="fast-cups-overview" aria-labelledby="fast-cups-title">
      <div className="fast-cups-heading">
        <div className="fast-cups-heading-copy">
          <span className="season-card-kicker">
            {fastCupIntroduction.descriptor}
          </span>
          <div className="fast-cups-title-row">
            <h2 id="fast-cups-title">Fastcup</h2>
            <p>{fastCupIntroduction.summary}</p>
          </div>
        </div>
        <Link
          className="season-calendar-link"
          href={fastCupIntroduction.tournamentsHref}
        >
          Открыть турниры
          <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
      <FastCupCarousel targetIndex={targetIndex}>
        {fastCupOverviews.map((cup) => {
          const tournamentHref =
            tournamentLinks[cup.linkId] ?? cup.tournamentHref;
          return (
            <FastCupCard
              key={cup.linkId}
              cup={cup}
              tournamentHref={tournamentHref}
              linkEditor={
                isOrganizer && !tournamentHref ? (
                  <SeasonTournamentLinkEditor
                    linkId={cup.linkId}
                    tournamentTitle={cup.title}
                  />
                ) : undefined
              }
            />
          );
        })}
      </FastCupCarousel>
    </section>
  );
}
