"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiMaximize2, FiX } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import type { OctoberClanMember } from "../model/clan-members";
import type { OctoberClanId } from "../model/clans";
import {
  octoberClanCardRows,
  octoberClanTotalPoints,
  rankOctoberClanMembers,
} from "../model/clan-standings";

function participantCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} участников`;
  if (lastDigit === 1) return `${count} участник`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} участника`;
  return `${count} участников`;
}

function pointCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} очков`;
  if (lastDigit === 1) return `${count} очко`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} очка`;
  return `${count} очков`;
}

function StandingRow({
  member,
  position,
  isCompact = false,
  isCurrentPlayer = false,
}: {
  member: OctoberClanMember;
  position: number;
  isCompact?: boolean;
  isCurrentPlayer?: boolean;
}) {
  const rowClasses = [
    "october-clan-standing-row",
    isCompact ? "october-clan-standing-row--compact" : "",
    isCurrentPlayer ? "october-clan-standing-row--current" : "",
  ].filter(Boolean).join(" ");
  return (
    <li className={rowClasses} aria-current={isCurrentPlayer ? "true" : undefined}>
      <span className="october-clan-standing-position">{position}</span>
      <Link href={`/players/${member.dotaId}`}>
        <span className="october-clan-standing-avatar" aria-hidden="true">
          <AvatarImage
            source={member.avatarUrl}
            alt=""
            width={28}
            height={28}
            sizes="28px"
            fallback={<span>{member.playerName.slice(0, 1).toLocaleUpperCase("ru")}</span>}
          />
        </span>
        <span className="october-clan-standing-name">{member.playerName}</span>
        {member.isReserved && <span className="october-clan-standing-reserved">Бронь</span>}
        {isCurrentPlayer && <span className="october-clan-standing-you">Вы</span>}
      </Link>
      <strong><FaStar aria-hidden="true" /> {member.totalPoints}</strong>
    </li>
  );
}

export function OctoberClanStandings({
  clanId,
  clanName,
  clanEmblem,
  members,
  viewerDiscordId,
}: {
  clanId: OctoberClanId;
  clanName: string;
  clanEmblem: string;
  members: readonly OctoberClanMember[];
  viewerDiscordId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rankedMembers = rankOctoberClanMembers(members);
  const cardRows = octoberClanCardRows(members, viewerDiscordId);
  const totalPoints = octoberClanTotalPoints(members);
  const titleId = `october-${clanId}-standings-title`;

  return (
    <article className={`october-clan-card october-clan-card--${clanId}`}>
      <div className="october-clan-identity">
        <div className="october-clan-total-stars" aria-label={`${pointCountLabel(totalPoints)} у клана ${clanName}`}>
          <FaStar aria-hidden="true" />
          <strong>{pointCountLabel(totalPoints)}</strong>
        </div>
        <div className="october-clan-flag" aria-label={`Флаг клана ${clanName}`}>
          <span className="october-clan-flag-inner">
            <Image src={clanEmblem} alt="" width={164} height={164} sizes="(max-width: 720px) 110px, 164px" />
          </span>
        </div>
        <h3>{clanName}</h3>
        <button
          className="october-clan-standing-open"
          type="button"
          onClick={() => dialogRef.current?.showModal()}
        >
          <FiMaximize2 aria-hidden="true" /> Полный зачёт клана
        </button>
      </div>
      <div className="october-clan-card-copy">
        <div className="october-clan-standings" aria-label={`Состав клана ${clanName}`}>
          {cardRows.length ? (
            <ol className="october-clan-standings-compact" aria-label={`Топ-10 клана ${clanName}`}>
              {cardRows.map((row, index) => row.kind === "ellipsis" ? (
                <li className="october-clan-standing-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>
                  <span>•••</span>
                </li>
              ) : (
                <StandingRow
                  key={row.member.discordId}
                  member={row.member}
                  position={row.position}
                  isCompact
                  isCurrentPlayer={row.member.discordId === viewerDiscordId}
                />
              ))}
            </ol>
          ) : (
            <p className="october-clan-standing-empty">Состав появится после распределения участников.</p>
          )}
        </div>
      </div>

      <dialog
        className={`october-clan-standing-dialog october-clan-standing-dialog--${clanId}`}
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="october-clan-standing-dialog-panel">
          <header>
            <div>
              <span>Полный зачёт клана</span>
              <h2 id={titleId}>{clanName}</h2>
              <p>{participantCountLabel(members.length)} · {pointCountLabel(totalPoints)}</p>
            </div>
            <button
              type="button"
              aria-label="Закрыть полный зачёт"
              onClick={() => dialogRef.current?.close()}
            >
              <FiX aria-hidden="true" />
            </button>
          </header>
          <div className="october-clan-standing-dialog-table">
            <div className="october-clan-standing-table-heading" aria-hidden="true">
              <span>Место</span><span>Участник</span><span>Очки</span>
            </div>
            {rankedMembers.length ? (
              <ol aria-label={`Полный зачёт клана ${clanName}`}>
                {rankedMembers.map((member, index) => (
                  <StandingRow
                    key={member.discordId}
                    member={member}
                    position={index + 1}
                    isCurrentPlayer={member.discordId === viewerDiscordId}
                  />
                ))}
              </ol>
            ) : (
              <p className="october-clan-standing-empty">В клане пока нет участников.</p>
            )}
          </div>
        </div>
      </dialog>
    </article>
  );
}
