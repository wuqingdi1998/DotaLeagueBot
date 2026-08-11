"use client";

import { FiClock, FiFlag } from "react-icons/fi";
import { useServerNow } from "../hooks/useServerNow";
import type {
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";

function remainingLabel(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function DraftAgreementPanel({
  series,
  userId,
  serverNow,
  isSending,
  send,
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  serverNow: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
}) {
  const now = useServerNow(serverNow, 1_000);

  if (series.status === "COMPLETE") return null;
  const request = series.endRequest;
  if (!request) {
    return (
      <div className="fearless-end-controls">
        <button
          type="button"
          disabled={isSending}
          onClick={() => {
            if (window.confirm(
              "Предложить сопернику завершить драфт? Если он не ответит за 5 минут, драфт завершится автоматически.",
            )) {
              void send({ action: "REQUEST_SERIES_END" });
            }
          }}
        >
          <FiFlag /> Предложить завершить драфт
        </button>
      </div>
    );
  }

  const ownRequest = request.requestedByPlayerId === userId;
  const requester = request.requestedByPlayerId === series.player1.id
    ? series.player1
    : series.player2;
  return (
    <section className={`fearless-end-request ${ownRequest ? "waiting" : "incoming"}`}>
      <FiClock />
      <div>
        <strong>
          {ownRequest
            ? "Запрос на завершение отправлен"
            : `${requester.name} предлагает завершить драфт`}
        </strong>
        <span>
          Без ответа драфт закроется через {remainingLabel(request.expiresAt, now)}
        </span>
      </div>
      {ownRequest ? (
        <button
          type="button"
          disabled={isSending}
          onClick={() => void send({ action: "CANCEL_SERIES_END" })}
        >
          Отменить запрос
        </button>
      ) : (
        <div className="fearless-end-actions">
          <button
            className="decline"
            type="button"
            disabled={isSending}
            onClick={() => void send({ action: "RESPOND_SERIES_END", response: "DECLINE" })}
          >
            Продолжить драфт
          </button>
          <button
            className="accept"
            type="button"
            disabled={isSending}
            onClick={() => void send({ action: "RESPOND_SERIES_END", response: "ACCEPT" })}
          >
            Завершить
          </button>
        </div>
      )}
    </section>
  );
}
