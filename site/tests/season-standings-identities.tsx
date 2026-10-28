import type { ReactNode } from "react";

export function PlayerProfileLink({ children, className, dotaId, nickname }: {
  children?: ReactNode; className?: string; dotaId: string; nickname: string;
}) {
  return <a href={`/players/${dotaId}`} className={className}>{children ?? nickname}</a>;
}

export function AvatarImage({ fallback }: { fallback: ReactNode }) { return fallback; }
