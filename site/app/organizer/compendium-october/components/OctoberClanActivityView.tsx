"use client";

import Link from "next/link";
import Image from "next/image";
import { FiX } from "react-icons/fi";
import type { OctoberClanId } from "../model/clans";
import { CLAN_ACTIVITY_COLUMNS, type ClanActivityQuest, type ClanDailyActivity } from "../model/clan-daily-activity";
import type { RefObject } from "react";

function QuestCircle({ quest }: { quest: ClanActivityQuest }) {
  const status = !quest.isAvailable ? quest.label === "ИР" ? "Недоступно без подписки" : "Недоступно сегодня"
    : quest.isCompleted ? "Выполнено" : "Не выполнено";
  const tooltip = `${quest.description}. Награда: ${quest.rewardStars} ★. ${status}`;
  return (
    <button type="button" className="october-clan-activity-circle" data-completed={quest.isCompleted}
      aria-disabled={!quest.isAvailable} aria-label={`${quest.label}: ${tooltip}`}>
      {quest.rewardStars}
      <span className="october-clan-activity-tooltip" role="tooltip">{tooltip}</span>
    </button>
  );
}

export function OctoberClanActivityTable({ activity, clanId }: { activity: ClanDailyActivity; clanId: string }) {
  const members = activity.members.filter((member) => member.clanId === clanId);
  return (
    <div className="october-clan-activity-table" role="table" aria-label="Звёзды и задания за сегодня">
      <div className="october-clan-activity-row october-clan-activity-heading" role="row">
        <span role="columnheader">Участник</span><span role="columnheader">★</span>
        {CLAN_ACTIVITY_COLUMNS.map((label) => <span role="columnheader" key={label}>{label}</span>)}
      </div>
      {members.map((member) => (
        <div className="october-clan-activity-row" role="row" key={member.discordId}>
          <Link role="cell" href={`/players/${member.dotaId}`} title={member.playerName}>{member.playerName}</Link>
          <strong role="cell" aria-label={`${member.dailyStars} звёзд за сегодня`}>{member.dailyStars}</strong>
          {member.quests.map((quest) => <span role="cell" key={quest.label}><QuestCircle quest={quest} /></span>)}
        </div>
      ))}
      {!members.length && <p className="october-clan-standing-empty">Сегодня в этом клане ещё никто не заработал звёзд.</p>}
    </div>
  );
}

export function OctoberClanActivityView({ clan, side, dialogRef, openDialog, closeDialog, onDialogClose, activity, error, retry }: {
  clan: { id: OctoberClanId; name: string; emblem: string }; side: "left" | "right"; dialogRef: RefObject<HTMLDialogElement | null>;
  openDialog: () => void; closeDialog: () => void; onDialogClose: () => void;
  activity: ClanDailyActivity | null; error: string | null; retry: () => void;
}) {
  const titleId = `october-${clan.id}-activity-title`;
  return (
    <>
      <button className={`october-clan-activity-tab october-clan-activity-tab--${side} october-clan-activity-tab--${clan.id}`} type="button"
        aria-label={`Активность клана ${clan.name} за сегодня`} title={`${clan.name} – активность за сегодня`}
        onClick={openDialog}>
        <Image src={clan.emblem} alt="" width={20} height={28} />
      </button>
      <dialog ref={dialogRef} className={`october-clan-standing-dialog october-clan-standing-dialog--${clan.id} october-clan-activity-dialog`}
        aria-labelledby={titleId} onClose={onDialogClose} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <div className="october-clan-standing-dialog-panel">
          <header><div><span>Активность за сегодня</span><h2 id={titleId}>{clan.name}</h2>
            <p>{activity?.dateLabel ?? "Загрузка…"} · московское время</p></div>
            <button type="button" aria-label="Закрыть активность клана" onClick={closeDialog}><FiX aria-hidden="true" /></button>
          </header>
          <div className="october-clan-standing-dialog-table" aria-live="polite">
            {error ? <p role="alert">{error} <button type="button" onClick={retry}>Повторить</button></p>
              : !activity ? <p role="status">Загружаем активность…</p>
                : !activity.isActive ? <p>Активность доступна во время Компендиума.</p>
                  : <OctoberClanActivityTable activity={activity} clanId={clan.id} />}
          </div>
        </div>
      </dialog>
    </>
  );
}
