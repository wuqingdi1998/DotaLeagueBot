import { FastCupCard } from "../components/FastCupCard";
import {
  fastCupIntroduction,
  fastCupOverviews,
} from "../model/season-overview-model";

export function FastCupsOverview() {
  return (
    <section className="fast-cups-overview" aria-labelledby="fast-cups-title">
      <div className="fast-cups-heading">
        <div>
          <span className="season-card-kicker">
            {fastCupIntroduction.descriptor}
          </span>
          <h2 id="fast-cups-title">Fast Cup</h2>
        </div>
        <p>
          {fastCupIntroduction.summary} {fastCupIntroduction.registration}
        </p>
      </div>
      <div className="fast-cups-grid">
        {fastCupOverviews.map((cup) => (
          <FastCupCard key={cup.title} cup={cup} />
        ))}
      </div>
    </section>
  );
}
