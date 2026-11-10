import Link from "next/link";
import { FiLogIn } from "react-icons/fi";

export function SeasonMatchStrip({
  matchId,
  pathname,
}: {
  matchId: number | null;
  pathname: string;
}) {
  if (matchId == null) return null;
  const href = `/season-lobby/${matchId}`;
  if (pathname.replace(/\/$/, "") === href) return null;

  return (
    <aside className="season-match-strip" aria-label="Активный матч лиги">
      <span className="season-match-strip-status">Матч идёт</span>
      <Link className="season-match-strip-link" href={href} prefetch={false}>
        <FiLogIn aria-hidden="true" />
        В лобби
      </Link>
    </aside>
  );
}
