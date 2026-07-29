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
  if (!/^[1-9]\d*$/.test(dotaId)) {
    return (
      <span className={className} title="Профиль игрока пока не привязан">
        {children ?? nickname}
      </span>
    );
  }

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
