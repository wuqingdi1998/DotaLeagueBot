import { FiAward, FiUsers } from "react-icons/fi";
import type { FastCupOverview } from "../model/season-overview-model";

export function FastCupCard({ cup }: { cup: FastCupOverview }) {
  return (
    <article className="fast-cup-card">
      <div className="fast-cup-heading">
        <h3>{cup.title}</h3>
      </div>
      <div className="fast-cup-facts">
        <span className="fast-cup-type">PRE-MADE</span>
        <span>
          <FiUsers aria-hidden="true" /> Свой состав
        </span>
        <span>
          <FiAward aria-hidden="true" /> {cup.prize}
        </span>
      </div>
    </article>
  );
}
