"use client";

import { useEffect, useId, useRef } from "react";
import {
  SEASON_PRIMARY_ROLE_WINS_REQUIRED,
  SEASON_SECONDARY_ROLE_WINS_REQUIRED,
} from "@/lib/season-ranked-wins/model";
import {
  SEASON_CANCELLATION_LEAD_HOURS,
  SEASON_CHECK_IN_LEAD_HOURS,
} from "@/lib/season-round-registration";
import { formatDayMonth, formatTime } from "../model/formatters";
import type { SeasonRound } from "../model/season-types";

type SeasonRegistrationConfirmationDialogProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  round: SeasonRound;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

function formatMoment(value: string | null, fallback: string) {
  return value
    ? `${formatDayMonth(value)} · ${formatTime(value)} МСК`
    : fallback;
}

export function SeasonRegistrationConfirmationDialog({
  isOpen,
  isSubmitting,
  round,
  onConfirm,
  onClose,
}: SeasonRegistrationConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const startMoment = formatMoment(round.scheduled_at, "после назначения даты");
  const cancellationMoment = formatMoment(
    round.cancellation_deadline,
    "после назначения даты тура",
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="season-registration-confirmation-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (isSubmitting) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <h3 id={titleId}>Подтверждение участия</h3>
      <p className="season-registration-confirmation-question">
        Вы подтверждаете готовность принять участие в туре, который состоится{" "}
        <strong>{startMoment}</strong>?
      </p>
      <ol>
        <li>
          Сняться с участия можно не позже чем за{" "}
          {SEASON_CANCELLATION_LEAD_HOURS} часа до старта тура. Крайний срок –{" "}
          <strong>{cancellationMoment}</strong>.
        </li>
        <li>
          Для участия нужно иметь {SEASON_PRIMARY_ROLE_WINS_REQUIRED} рейтинговых
          побед на основной роли и {SEASON_SECONDARY_ROLE_WINS_REQUIRED} победы на
          дополнительной роли. Stratz и Dotabuff могут некорректно отображать
          матчи. В случае ошибки отправьте <strong>@frokeng</strong> скриншот
          рейтинговых матчей за месяц по ролям из статистики Dota+.
        </li>
        <li>
          Подтверждение участия подразумевает прохождение чек-ина за{" "}
          {SEASON_CHECK_IN_LEAD_HOURS} часа до старта тура, а также согласие со
          всеми серверными и турнирными правилами в канале <strong>#правила</strong>.
        </li>
      </ol>
      <div className="season-registration-confirmation-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Нет
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={isSubmitting}
          onClick={() => void onConfirm()}
        >
          {isSubmitting ? "Сохраняем…" : "Да"}
        </button>
      </div>
    </dialog>
  );
}
