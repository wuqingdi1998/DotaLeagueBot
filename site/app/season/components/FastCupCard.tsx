import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import type { FastCupOverview } from "../model/season-overview-model";

export function FastCupCard({ cup }: { cup: FastCupOverview }) {
  const content = (
    <>
      <h3>{cup.title}</h3>
      <div className="fast-cup-facts">
        <span className="fast-cup-period">{cup.period}</span>
        <span className="fast-cup-format">{cup.format}</span>
        <span>Турнир для Boosty подписчиков</span>
        <strong>Призовой фонд – {cup.prize}</strong>
      </div>
      <span
        className={`fast-cup-open-link${cup.tournamentHref ? "" : " is-disabled"}`}
        aria-disabled={cup.tournamentHref ? undefined : "true"}
      >
        Открыть турнир <FiArrowRight aria-hidden="true" />
      </span>
    </>
  );

  return (
    <article
      className={`fast-cup-card is-${cup.accent}${cup.tournamentHref ? "" : " is-disabled"}`}
    >
      {cup.tournamentHref ? (
        <Link
          className="fast-cup-card-link"
          href={cup.tournamentHref}
          aria-label={`Открыть ${cup.title}`}
        >
          {content}
        </Link>
      ) : (
        <div className="fast-cup-card-link">{content}</div>
      )}
    </article>
  );
}
