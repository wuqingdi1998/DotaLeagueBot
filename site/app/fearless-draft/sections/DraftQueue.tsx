"use client";

import { useState } from "react";
import { FiCpu, FiRadio, FiSend, FiUsers, FiUserX } from "react-icons/fi";
import type {
  DraftInvitationSnapshot,
  FearlessDraftCommand,
  FearlessDraftSnapshot,
} from "../model/snapshot";
import type { DraftFormat } from "../model/types";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { useDraftLocale } from "../hooks/useDraftLocale";

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
  const { text } = useDraftLocale();
  const isIncoming = invitation.direction === "INCOMING";
  return (
    <article className={`fearless-invitation ${isIncoming ? "incoming" : "outgoing"}`}>
      <PlayerAvatar player={invitation.opponent} />
      <div>
        <strong>{invitation.opponent.name}</strong>
        <span>
          {isIncoming ? text.invitesYou : text.waitingResponse} {invitation.format}
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
            {text.accept}
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
          {isIncoming ? text.decline : text.cancel}
        </button>
      </div>
    </article>
  );
}

export function DraftQueue({ snapshot, isSending, send }: QueueProps) {
  const { text } = useDraftLocale();
  const [format, setFormat] = useState<DraftFormat>("BO3");
  return (
    <section className="fearless-queue-panel">
      <div className="fearless-section-heading">
        <div>
          <span className="section-kicker">{text.opponentSearch}</span>
          <h2>{snapshot.isWaiting ? text.inQueue : text.startSearchTitle}</h2>
          <p>{text.queueDescription}</p>
        </div>
        <div className="fearless-queue-actions">
          {snapshot.isOrganizer && (
            <>
              <button
                className="secondary-button"
                type="button"
                disabled={isSending}
                onClick={() => void send({ action: "START_BOT" })}
              >
                <FiCpu /> {text.bot}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isSending}
                onClick={() => void send({ action: "START_BOT2" })}
              >
                <FiUsers /> {text.bot2}
              </button>
            </>
          )}
          {snapshot.isWaiting ? (
            <button
              className="secondary-button"
              type="button"
              disabled={isSending}
              onClick={() => void send({ action: "LEAVE_QUEUE" })}
            >
              <FiUserX /> {text.leaveSearch}
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              disabled={isSending}
              onClick={() => void send({ action: "JOIN_QUEUE" })}
            >
              <FiRadio /> {text.startSearch}
            </button>
          )}
        </div>
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
          <div className="fearless-format-picker" role="group" aria-label={text.seriesFormat}>
            <span>{text.inviteTo}</span>
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
                  <small><i /> {text.searchingOpponent}</small>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSending}
                  onClick={() => void send({ action: "INVITE", opponentId: player.id, format })}
                >
                  <FiSend /> {text.invite}
                </button>
              </article>
            )) : (
              <div className="fearless-empty-state">
                <FiRadio />
                <strong>{text.nobodyHere}</strong>
                <span>{text.listUpdates}</span>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
