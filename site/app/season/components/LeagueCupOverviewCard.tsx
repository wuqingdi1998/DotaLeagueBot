import Link from "next/link";
import { FiArrowRight, FiAward, FiStar, FiUserCheck } from "react-icons/fi";
import { leagueCupOverview } from "../model/season-overview-model";

export function LeagueCupOverviewCard() {
  return (
    <article className="season-feature-card season-cup-card">
      <div className="season-card-heading">
        <div>
          <span className="season-card-kicker">Специальный турнир</span>
          <h2>{leagueCupOverview.title}</h2>
        </div>
        <span className="season-format-badge">{leagueCupOverview.descriptor}</span>
      </div>

      <p className="season-card-summary">{leagueCupOverview.summary}</p>

      <div className="season-invitation-callout">
        <FiUserCheck aria-hidden="true" />
        <div>
          <strong>{leagueCupOverview.participation}</strong>
          <span>{leagueCupOverview.invitation}</span>
        </div>
      </div>

      <p className="season-cup-advice">
        <FiStar aria-hidden="true" />
        {leagueCupOverview.advice}
      </p>

      <div className="season-cup-prize">
        <FiAward aria-hidden="true" />
        <span>Призовой фонд</span>
        <strong>{leagueCupOverview.prize}</strong>
      </div>

      <div className="season-card-action">
        <Link
          className="season-tournament-link"
          href={leagueCupOverview.tournamentHref}
        >
          Открыть кубок
          <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
