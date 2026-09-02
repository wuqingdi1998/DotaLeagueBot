import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { FastCupCard } from "../components/FastCupCard";
import {
  fastCupIntroduction,
  fastCupOverviews,
} from "../model/season-overview-model";

export function FastCupsOverview() {
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
      <div className="fast-cups-grid">
        {fastCupOverviews.map((cup) => (
          <FastCupCard key={cup.title} cup={cup} />
        ))}
      </div>
    </section>
  );
}
