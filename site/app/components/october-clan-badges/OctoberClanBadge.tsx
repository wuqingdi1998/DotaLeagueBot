"use client";

import Image from "next/image";
import { useContext } from "react";
import { OCTOBER_CLANS, type OctoberClanId } from "@/lib/october-clans";
import { OctoberClanBadgeContext } from "./OctoberClanBadgesProvider";

export function OctoberClanBadge({
  clanId,
  dotaId,
}: {
  clanId?: OctoberClanId;
  dotaId?: string | null;
}) {
  const context = useContext(OctoberClanBadgeContext);
  if (!context.isActive) return null;
  const resolvedClanId = clanId ?? (dotaId ? context.clansByDotaId[dotaId] : undefined);
  const clan = OCTOBER_CLANS.find((entry) => entry.id === resolvedClanId);
  if (!clan) return null;

  return (
    <span
      className={`october-clan-name-badge october-clan-name-badge--${clan.id}`}
      aria-label={`Клан «${clan.name}»`}
      title={`Клан «${clan.name}»`}
    >
      <Image
        className="october-clan-name-badge-image"
        src={clan.emblem}
        alt=""
        width={34}
        height={34}
      />
    </span>
  );
}
