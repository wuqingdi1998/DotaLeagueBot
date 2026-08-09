"use client";

import { useState } from "react";
import { FiRadio, FiSend, FiUserX } from "react-icons/fi";
import type {
  DraftInvitationSnapshot,
  FearlessDraftCommand,
  FearlessDraftSnapshot,
} from "../model/snapshot";
import type { DraftFormat } from "../model/types";
import { PlayerAvatar } from "../components/PlayerAvatar";

type QueueProps = {
  snapshot: FearlessDraftSnapshot;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
};

function InvitationCard({
  invitation,
  isSending,
  send,
}: {
  invitation: DraftInvitationSnapshot;
  isSending: boolean;
  send: QueueProps["send"];
}) {
  const isIncoming = invitation.direction === "INCOMING";
  return (
    <article className={`fearless-invitation ${isIncoming ? "incoming" : "outgoing"}`}>
      <PlayerAvatar player={invitation.opponent} />
      <div>
        <strong>{invitation.opponent.name}</strong>
        <span>
          {isIncoming ? "приглашает вас сыграть" : "ждём ответа на"} {invitation.format}
        </span>
      </div>
      <div className="fearless-invitation-actions">
        {isIncoming && (
          <button
            className="primary-button"
            type="button"
            disabled={isSending}
            onClick={() => void send({ action: "ACCEPT_INVITATION", invitationId: invitation.id })}
          >
            Принять
          </button>
        )}
        <button
          className="secondary-button"
          type="button"
          disabled={isSending}
          onClick={() => void send({
            action: isIncoming ? "DECLINE_INVITATION" : "CANCEL_INVITATION",
            invitationId: invitation.id,
          })}
        >
          {isIncoming ? "Отклонить" : "Отменить"}
        </button>
      </div>
    </article>
  );
}

export function DraftQueue({ snapshot, isSending, send }: QueueProps) {
  const [format, setFormat] = useState<DraftFormat>("BO3");
  return (
    <section className="fearless-queue-panel">
      <div className="fearless-section-heading">
        <div>
          <span className="section-kicker">Поиск соперника</span>
          <h2>{snapshot.isWaiting ? "Вы в очереди" : "Начните поиск"}</h2>
          <p>
            Оба участника должны быть зарегистрированы и находиться на этой странице.
          </p>
        </div>
        {snapshot.isWaiting ? (
          <button
            className="secondary-button"
            type="button"
            disabled={isSending}
            onClick={() => void send({ action: "LEAVE_QUEUE" })}
          >
            <FiUserX /> Покинуть поиск
          </button>
        ) : (
          <button
            className="primary-button"
            type="button"
            disabled={isSending}
            onClick={() => void send({ action: "JOIN_QUEUE" })}
          >
            <FiRadio /> Начать поиск
          </button>
        )}
      </div>

      {snapshot.invitations.length > 0 && (
        <div className="fearless-invitations">
          {snapshot.invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              isSending={isSending}
              send={send}
            />
          ))}
        </div>
      )}

      {snapshot.isWaiting && (
        <>
          <div className="fearless-format-picker" role="group" aria-label="Формат серии">
            <span>Пригласить на:</span>
            {(["BO2", "BO3"] as const).map((value) => (
              <button
                key={value}
                className={format === value ? "selected" : undefined}
                type="button"
                onClick={() => setFormat(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="fearless-waiting-list">
            {snapshot.waitingPlayers.length ? snapshot.waitingPlayers.map((player) => (
              <article key={player.id}>
                <PlayerAvatar player={player} />
                <div>
                  <strong>{player.name}</strong>
                  <span>Discord: {player.discordName}</span>
                  <small><i /> Ищет соперника</small>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSending}
                  onClick={() => void send({ action: "INVITE", opponentId: player.id, format })}
                >
                  <FiSend /> Пригласить
                </button>
              </article>
            )) : (
              <div className="fearless-empty-state">
                <FiRadio />
                <strong>Пока никого нет</strong>
                <span>Список обновляется автоматически.</span>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
