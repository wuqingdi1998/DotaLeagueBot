import { FiAward, FiStar, FiUserCheck } from "react-icons/fi";
import { leagueCupOverview } from "../model/season-overview-model";

export function LeagueCupOverviewCard() {
  return (
    <article className="season-cup-card">
      <div className="season-compact-card-heading">
        <div>
          <span className="season-card-kicker">Специальный турнир</span>
          <h2>{leagueCupOverview.title}</h2>
        </div>
        <div className="season-compact-prize">
          <FiAward aria-hidden="true" />
          <span>Призовые</span>
          <strong>{leagueCupOverview.prize}</strong>
        </div>
      </div>

      <p className="season-compact-descriptor">{leagueCupOverview.descriptor}</p>
      <p>{leagueCupOverview.summary}</p>

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
    </article>
  );
}
