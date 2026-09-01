import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import type { FastCupOverview } from "../model/season-overview-model";

export function FastCupCard({ cup }: { cup: FastCupOverview }) {
  return (
    <article className="fast-cup-card">
      <Link
        className="fast-cup-card-link"
        href={cup.tournamentHref}
        aria-label={`Открыть ${cup.title}`}
      >
        <h3>{cup.title}</h3>
        <div className="fast-cup-facts">
          <span>Турнир для Boosty подписчиков</span>
          <strong>Призовой фонд — {cup.prize}</strong>
        </div>
        <span className="fast-cup-open-link">
          Открыть турнир <FiArrowRight aria-hidden="true" />
        </span>
      </Link>
    </article>
  );
}
