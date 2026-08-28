"use client";

import { useMemo } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { DraftCoinToss, type CoinTossStage } from "../components/DraftCoinToss";
import { DraftAvatarPreloader } from "../components/DraftAvatarPreloader";
import { DraftFullscreenToggle } from "../components/DraftFullscreenToggle";
import { HeroPortraitPreloader } from "../components/HeroPortraitPreloader";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { useServerNow } from "../hooks/useServerNow";
import {
  COIN_FLIP_DURATION_MS,
  COIN_SPINNER_DURATION_MS,
} from "../model/config";
import type {
  DraftLobbyPlayer,
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";
import type { DraftChoice } from "../model/types";
import { useDraftLocale } from "../hooks/useDraftLocale";

function coinTossStage(elapsedMs: number): CoinTossStage {
  if (elapsedMs < COIN_FLIP_DURATION_MS) return "FLIPPING";
  if (elapsedMs < COIN_FLIP_DURATION_MS + COIN_SPINNER_DURATION_MS) {
    return "SPINNING";
  }
  return "REVEALED";
}

export function DraftChoices({
  series,
  userId,
  serverNow,
  isSending,
  send,
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
  lobbyPlayers,
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  serverNow: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => Promise<void>;
  lobbyPlayers?: readonly DraftLobbyPlayer[];
}) {
  const { text } = useDraftLocale();
  const { map } = series;
  const synchronizedNow = useServerNow(serverNow, 50);
  const firstChooser = map.firstChooserId === series.player1.id
    ? series.player1
    : series.player2;
  const secondChooser = map.firstChooserId === series.player1.id
    ? series.player2
    : series.player1;
  const isFirstDecision = map.status === "FIRST_DECISION";
  const decisionPlayer = isFirstDecision ? firstChooser : secondChooser;
  const choices = useMemo<DraftChoice[]>(() => {
    if (isFirstDecision) return ["FIRST", "SECOND", "RADIANT", "DIRE"];
    return map.firstChoice === "RADIANT" || map.firstChoice === "DIRE"
      ? ["FIRST", "SECOND"]
      : ["RADIANT", "DIRE"];
  }, [isFirstDecision, map.firstChoice]);
  const hasCoinToss = map.coinTossWinnerId !== null;
  const tossStage = coinTossStage(Math.max(
    0,
    synchronizedNow - Date.parse(map.createdAt),
  ));
  const isCoinRevealed = !hasCoinToss || tossStage === "REVEALED";
  const choiceLabels: Record<DraftChoice, string> = {
    FIRST: text.choiceFirst,
    SECOND: text.choiceSecond,
    RADIANT: text.choiceRadiant,
    DIRE: text.choiceDire,
  };

  return (
    <section className="fearless-choice-screen">
      <HeroPortraitPreloader />
      <DraftAvatarPreloader
        firstCaptainAvatarUrl={series.player1.avatarUrl}
        secondCaptainAvatarUrl={series.player2.avatarUrl}
        lobbyPlayers={lobbyPlayers}
      />
      <div className="fearless-choice-header">
        <div className="fearless-series-meta">
          <span>{text.map} {map.number} / {series.format}</span>
          <strong>{text.sidesAndOrder}</strong>
        </div>
        <DraftFullscreenToggle
          isFullscreen={isFullscreen}
          isFullscreenSupported={isFullscreenSupported}
          toggleFullscreen={toggleFullscreen}
        />
      </div>

      {hasCoinToss && map.coinTossWinnerId && (
        <>
          <DraftCoinToss
            leftPlayer={series.player1}
            rightPlayer={series.player2}
            winnerId={map.coinTossWinnerId}
            segment={map.coinTossSegment ?? 0}
            stage={tossStage}
          />
          <p className="fearless-coin-result">
            {tossStage === "FLIPPING" && text.coinFlipping}
            {tossStage === "SPINNING" && text.spinnerChoosing}
            {tossStage === "REVEALED" && (
              <><FiCheckCircle /> {text.coinWinner} <strong>{firstChooser.name}</strong></>
            )}
          </p>
        </>
      )}

      {!hasCoinToss && (
        <p className="fearless-map-two-choice">
          {text.mapTwoChoiceBefore} <strong>{firstChooser.name}</strong>, {text.mapTwoChoiceAfter}
        </p>
      )}

      {isCoinRevealed && (
        <div className="fearless-decision-card">
          <div className="fearless-decision-player">
            <PlayerAvatar player={decisionPlayer} freezeAnimation />
            <div>
              <span>{isFirstDecision ? text.firstChoice : text.responseChoice}</span>
              <strong>{decisionPlayer.name}</strong>
            </div>
          </div>
          {!isFirstDecision && map.firstChoice && (
            <p>
              {firstChooser.name} {text.chose}: <strong>{choiceLabels[map.firstChoice]}</strong>
            </p>
          )}
          {decisionPlayer.id === userId ? (
            <div className="fearless-choice-buttons">
              {choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={isSending}
                  onClick={() => void send({ action: "MAKE_CHOICE", choice })}
                >
                  {choiceLabels[choice]}
                </button>
              ))}
            </div>
          ) : (
            <div className="fearless-waiting-choice">
              <i /> {text.waitingDecision}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
