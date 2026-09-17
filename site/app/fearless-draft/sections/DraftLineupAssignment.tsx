"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FiCheck, FiLock } from "react-icons/fi";
import { DraftFullscreenToggle } from "../components/DraftFullscreenToggle";
import { useDraftLocale } from "../hooks/useDraftLocale";
import { FEARLESS_DRAFT_HEROES_BY_ID } from "../model/heroes";
import { draftLobbyTeamForCaptain } from "../model/lobby-roster";
import type {
  DraftLineupAssignment as LineupAssignment,
  DraftLobbyPlayer,
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";

function SubmittedLineup({
  captainName,
  assignments,
}: {
  captainName: string;
  assignments: readonly LineupAssignment[];
}) {
  const { text } = useDraftLocale();
  return (
    <article className="fearless-lineup-team-result">
      <header>
        <span>{text.lineupTeam}</span>
        <strong>{captainName}</strong>
      </header>
      <div>
        {assignments.map((assignment) => {
          const hero = FEARLESS_DRAFT_HEROES_BY_ID.get(assignment.heroId);
          if (!hero) return null;
          return (
            <div className="fearless-lineup-result-card" key={assignment.heroId}>
              <Image
                src={hero.portraitUrl}
                alt={hero.name}
                width={70}
                height={123}
                unoptimized
              />
              <span>{hero.name}</span>
              <strong>{assignment.playerName}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function DraftLineupAssignment({
  series,
  userId,
  lobbyPlayers = [],
  isSending,
  send,
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
  canAdvanceToNextMap,
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  lobbyPlayers?: DraftLobbyPlayer[];
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => Promise<void>;
  canAdvanceToNextMap: boolean;
}) {
  const { text } = useDraftLocale();
  const lineup = series.map.lineupAssignment;
  const [selection, setSelection] = useState<Record<number, string>>({});
  const [isLocallySubmitted, setIsLocallySubmitted] = useState(false);
  const captains = [series.player1, series.player2] as const;
  const viewer = lobbyPlayers.find((player) => player.id === userId);
  const ownCaptain = captains.find((captain) => {
    const captainPlayer = lobbyPlayers.find((player) => player.id === captain.id);
    return viewer && captainPlayer && viewer.teamSide === captainPlayer.teamSide;
  });
  const isCaptain = captains.some((captain) => captain.id === userId);
  const ownSubmitted = isLocallySubmitted || (userId === series.player1.id
    ? lineup?.player1Submitted
    : userId === series.player2.id
      ? lineup?.player2Submitted
      : ownCaptain?.id === series.player1.id
        ? lineup?.player1Submitted
        : lineup?.player2Submitted);
  const ownHeroIds = useMemo(() => series.map.actions
    .filter((action) => action.type === "PICK" && action.actorId === userId)
    .map((action) => action.heroId)
    .filter((heroId): heroId is number => heroId !== null), [series.map.actions, userId]);
  const ownPlayers = isCaptain
    ? draftLobbyTeamForCaptain(lobbyPlayers, userId).slice(0, 5)
    : [];
  const selectedPlayerIds = new Set(Object.values(selection));
  const canSubmit = ownHeroIds.length === 5 && ownPlayers.length === 5 &&
    ownHeroIds.every((heroId) => selection[heroId]);
  const visibleGroups = captains.map((captain) => ({
    captain,
    assignments: lineup?.assignments.filter(
      (assignment) => assignment.captainId === captain.id,
    ) ?? [],
  })).filter((group) => group.assignments.length === 5);
  const hasNextMap = series.map.number < (series.format === "BO2" ? 2 : 3);
  const ownReady = userId === series.player1.id
    ? series.player1ReadyForNextMap
    : series.player2ReadyForNextMap;

  const submit = async () => {
    if (!canSubmit) return;
    const isSaved = await send({
      action: "SUBMIT_LINEUP_ASSIGNMENT",
      assignments: ownHeroIds.map((heroId) => ({
        heroId,
        playerId: selection[heroId],
      })),
    });
    if (isSaved) setIsLocallySubmitted(true);
  };

  return (
    <section className="fearless-lineup-assignment">
      <header className="fearless-lineup-heading">
        <div>
          <span>{text.map} {series.map.number} / {series.format}</span>
          <h2>{lineup?.isRevealed ? text.lineupRevealed : text.lineupTitle}</h2>
          <p>{lineup?.isRevealed ? text.lineupRevealedDescription : text.lineupDescription}</p>
        </div>
        <DraftFullscreenToggle
          isFullscreen={isFullscreen}
          isFullscreenSupported={isFullscreenSupported}
          toggleFullscreen={toggleFullscreen}
        />
      </header>

      {lineup?.isRevealed ? (
        <div className="fearless-lineup-results">
          {visibleGroups.map((group) => (
            <SubmittedLineup
              key={group.captain.id}
              captainName={group.captain.name}
              assignments={group.assignments}
            />
          ))}
        </div>
      ) : isCaptain && !ownSubmitted ? (
        <div className="fearless-lineup-form">
          {ownHeroIds.map((heroId) => {
            const hero = FEARLESS_DRAFT_HEROES_BY_ID.get(heroId);
            if (!hero) return null;
            return (
              <label key={heroId} className="fearless-lineup-hero-row">
                <Image
                  src={hero.portraitUrl}
                  alt={hero.name}
                  width={70}
                  height={123}
                  unoptimized
                />
                <span>{hero.name}</span>
                <select
                  value={selection[heroId] ?? ""}
                  onChange={(event) => setSelection((current) => ({
                    ...current,
                    [heroId]: event.target.value,
                  }))}
                >
                  <option value="">{text.lineupChoosePlayer}</option>
                  {ownPlayers.map((player) => (
                    <option
                      key={player.id}
                      value={player.id}
                      disabled={selectedPlayerIds.has(player.id) && selection[heroId] !== player.id}
                    >
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <button
            className="primary-button fearless-lineup-submit"
            type="button"
            disabled={!canSubmit || isSending}
            onClick={() => void submit()}
          >
            <FiLock aria-hidden="true" />
            {isSending ? text.lineupSaving : text.lineupConfirm}
          </button>
        </div>
      ) : (
        <div className="fearless-lineup-waiting">
          <FiLock aria-hidden="true" />
          <strong>{ownSubmitted ? text.lineupSaved : text.lineupCaptainWorking}</strong>
          <p>{text.lineupWaitingOpponent}</p>
          {visibleGroups.map((group) => (
            <SubmittedLineup
              key={group.captain.id}
              captainName={group.captain.name}
              assignments={group.assignments}
            />
          ))}
        </div>
      )}

      {lineup?.isRevealed && isCaptain && hasNextMap && canAdvanceToNextMap && (
        <button
          className="primary-button fearless-lineup-next-map"
          type="button"
          disabled={isSending || ownReady}
          onClick={() => void send({ action: "READY_FOR_NEXT_MAP" })}
        >
          <FiCheck aria-hidden="true" />
          {ownReady ? text.waitingOpponent : `${text.readyForMap} ${series.map.number + 1}`}
        </button>
      )}
    </section>
  );
}
