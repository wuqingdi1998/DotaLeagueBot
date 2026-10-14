"use client";

import Link from "next/link";
import { FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import type { OCTOBER_CLANS } from "../model/clans";
import { CLAN_ACTIVITY_COLUMNS, type ClanActivityQuest, type ClanDailyActivity } from "../model/clan-daily-activity";
import { useClanActivity } from "../hooks/useClanActivity";
import { useOctoberClanDialog } from "../hooks/useOctoberClanDialog";

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

export function OctoberClanActivity({ clan, side }: { clan: typeof OCTOBER_CLANS[number]; side: "left" | "right" }) {
  const { dialogRef, isDialogOpen, openDialog, closeDialog, onDialogClose } = useOctoberClanDialog();
  const { activity, error, retry } = useClanActivity(isDialogOpen);
  const titleId = `october-${clan.id}-activity-title`;
  return (
    <>
      <button className={`october-clan-activity-wing october-clan-activity-wing--${side}`} type="button"
        aria-label={`Активность клана ${clan.name} за сегодня`} title={`${clan.name} – активность за сегодня`}
        onClick={openDialog}>
        <svg viewBox="0 0 36 74" aria-hidden="true"><path d="M33 8C23 15 12 16 3 6c1 16 9 23 20 25C13 34 6 31 2 26c3 15 10 20 23 20C16 50 10 48 5 45c4 12 12 19 28 23Z" /></svg>
        <FaStar aria-hidden="true" />
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
