import { FiArrowRight, FiAward, FiCalendar, FiStar, FiUserCheck } from "react-icons/fi";
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

      <p className="season-card-period">
        <FiCalendar aria-hidden="true" />
        {leagueCupOverview.period}
      </p>

      <p className="season-card-summary">{leagueCupOverview.summary}</p>

      <div className="season-registration-callout">
        <FiUserCheck aria-hidden="true" />
        <strong>{leagueCupOverview.participation}</strong>
      </div>

      <div className="season-scoring-line">
        <FiStar aria-hidden="true" />
        <div>
          <strong>{leagueCupOverview.advice}</strong>
          <span>{leagueCupOverview.invitation}</span>
        </div>
      </div>

      <div className="season-league-outcome">
        <div className="season-final-callout">
          <strong>{leagueCupOverview.accessLabel}</strong>
          <span>{leagueCupOverview.accessExplanation}</span>
        </div>
        <div className="season-prize">
          <FiAward aria-hidden="true" />
          <span>Призовой фонд</span>
          <strong>{leagueCupOverview.prize}</strong>
        </div>
      </div>

      <div className="season-card-action">
        <span
          className="season-tournament-link is-disabled"
          aria-disabled="true"
        >
          Открыть кубок
          <FiArrowRight aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
