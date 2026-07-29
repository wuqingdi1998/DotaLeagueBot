import type { ReactNode } from "react";
import Link from "next/link";

export function PlayerProfileLink({
  children,
  className,
  dotaId,
  nickname,
}: {
  children?: ReactNode;
  className?: string;
  dotaId: string;
  nickname: string;
}) {
  return (
    <Link
      className={className}
      href={`/players/${dotaId}`}
      aria-label={`Открыть профиль игрока ${nickname}`}
    >
      {children ?? nickname}
    </Link>
  );
}
