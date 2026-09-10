import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowRight } from "react-icons/fi";
import type { FastCupOverview } from "../model/season-overview-model";

type FastCupCardProps = {
  cup: FastCupOverview;
  tournamentHref: string | null;
  linkEditor?: ReactNode;
};

export function FastCupCard({
  cup,
  tournamentHref,
  linkEditor,
}: FastCupCardProps) {
  const content = (
    <>
      <h3>{cup.title}</h3>
      <div className="fast-cup-facts">
        <span className="fast-cup-period">{cup.period}</span>
        <span className="fast-cup-format">{cup.format}</span>
        <span>Турнир для Boosty подписчиков</span>
        <strong>Призовой фонд – {cup.prize}</strong>
      </div>
      <div className="fast-cup-action">
        <span
          className={`fast-cup-open-link${tournamentHref ? "" : " is-disabled"}`}
          aria-disabled={tournamentHref ? undefined : "true"}
        >
          Открыть турнир <FiArrowRight aria-hidden="true" />
        </span>
        {linkEditor}
      </div>
    </>
  );

  return (
    <article
      className={`fast-cup-card is-${cup.accent}${tournamentHref ? "" : " is-disabled"}`}
    >
      {tournamentHref ? (
        <Link
          className="fast-cup-card-link"
          href={tournamentHref}
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
