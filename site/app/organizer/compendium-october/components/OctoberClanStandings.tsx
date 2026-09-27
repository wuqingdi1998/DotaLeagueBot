"use client";

import { useRef } from "react";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiMaximize2, FiX } from "react-icons/fi";
import type { OctoberClanMember } from "../model/clan-members";
import type { OctoberClanId } from "../model/clans";
import {
  OCTOBER_CLAN_CARD_LEADER_LIMIT,
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
}: {
  member: OctoberClanMember;
  position: number;
  isCompact?: boolean;
}) {
  return (
    <li className={isCompact ? "october-clan-standing-row october-clan-standing-row--compact" : "october-clan-standing-row"}>
      <span className="october-clan-standing-position">{position}</span>
      <Link href={`/players/${member.dotaId}`}>
        <span className="october-clan-standing-avatar" aria-hidden="true">
          {member.playerName.slice(0, 1).toLocaleUpperCase("ru")}
        </span>
        <span className="october-clan-standing-name">{member.playerName}</span>
      </Link>
      <strong><FaStar aria-hidden="true" /> {member.totalPoints}</strong>
    </li>
  );
}

export function OctoberClanStandings({
  clanId,
  clanName,
  members,
}: {
  clanId: OctoberClanId;
  clanName: string;
  members: readonly OctoberClanMember[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rankedMembers = rankOctoberClanMembers(members);
  const leaders = rankedMembers.slice(0, OCTOBER_CLAN_CARD_LEADER_LIMIT);
  const totalPoints = octoberClanTotalPoints(members);
  const titleId = `october-${clanId}-standings-title`;

  return (
    <div className="october-clan-standings" aria-label={`Состав клана ${clanName}`}>
      <div className="october-clan-standing-summary">
        <span>{participantCountLabel(members.length)}</span>
        <strong><FaStar aria-hidden="true" /> {pointCountLabel(totalPoints)}</strong>
      </div>
      {leaders.length ? (
        <ol className="october-clan-standings-compact" aria-label={`Топ-10 клана ${clanName}`}>
          {leaders.map((member, index) => (
            <StandingRow
              key={member.discordId}
              member={member}
              position={index + 1}
              isCompact
            />
          ))}
        </ol>
      ) : (
        <p className="october-clan-standing-empty">Состав появится после распределения участников.</p>
      )}
      <button
        className="october-clan-standing-open"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <FiMaximize2 aria-hidden="true" /> Полный зачёт клана
      </button>

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
                  <StandingRow key={member.discordId} member={member} position={index + 1} />
                ))}
              </ol>
            ) : (
              <p className="october-clan-standing-empty">В клане пока нет участников.</p>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
