import type { ReactNode } from "react";
import Link from "next/link";
import { OctoberClanBadge } from "./october-clan-badges/OctoberClanBadge";

export function PlayerProfileLink({
  children,
  className,
  dotaId,
  nickname,
  showClanBadge,
}: {
  children?: ReactNode;
  className?: string;
  dotaId: string;
  nickname: string;
  showClanBadge?: boolean;
}) {
  const shouldShowClanBadge = showClanBadge ?? children === undefined;
  const content = (
    <>
      {children ?? nickname}
      {shouldShowClanBadge && <OctoberClanBadge dotaId={dotaId} />}
    </>
  );
  if (!/^[1-9]\d*$/.test(dotaId)) {
    return (
      <span className={className} title="Профиль игрока пока не привязан">
        {content}
      </span>
    );
  }

  return (
    <Link
      className={className}
      href={`/players/${dotaId}`}
      aria-label={`Открыть профиль игрока ${nickname}`}
    >
      {content}
    </Link>
  );
}
