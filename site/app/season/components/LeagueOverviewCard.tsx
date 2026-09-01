import Link from "next/link";
import {
  FiArrowRight,
  FiAward,
  FiCalendar,
  FiTarget,
  FiUserCheck,
} from "react-icons/fi";
import { leagueOverview } from "../model/season-overview-model";

export function LeagueOverviewCard() {
  return (
    <article className="season-feature-card season-league-card">
      <div className="season-card-heading">
        <div>
          <span className="season-card-kicker">Главное событие</span>
          <h2>
            <Link href={leagueOverview.tournamentHref}>
              {leagueOverview.title}
            </Link>
          </h2>
        </div>
        <span className="season-format-badge">{leagueOverview.descriptor}</span>
      </div>

      <p className="season-card-period">
        <FiCalendar aria-hidden="true" />
        {leagueOverview.period}
      </p>

      <p className="season-card-summary">{leagueOverview.summary}</p>

      <div className="season-registration-callout">
        <FiUserCheck aria-hidden="true" />
        <strong>{leagueOverview.registration}</strong>
      </div>

      <div className="season-scoring-line">
        <FiTarget aria-hidden="true" />
        <div>
          <strong>{leagueOverview.scoring}</strong>
          <span>{leagueOverview.ranking}</span>
        </div>
      </div>

      <div className="season-league-outcome">
        <div className="season-final-callout">
          <strong>{leagueOverview.finalLabel}</strong>
          <span>{leagueOverview.finalExplanation}</span>
        </div>
        <div className="season-prize">
          <FiAward aria-hidden="true" />
          <span>Призовой фонд</span>
          <strong>{leagueOverview.prize}</strong>
        </div>
      </div>

      <div className="season-card-action">
        <Link className="season-tournament-link" href={leagueOverview.tournamentHref}>
          Открыть лигу
          <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
