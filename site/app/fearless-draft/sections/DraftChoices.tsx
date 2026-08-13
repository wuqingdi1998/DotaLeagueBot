"use client";

import { useMemo } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { DraftCoinToss, type CoinTossStage } from "../components/DraftCoinToss";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { useServerNow } from "../hooks/useServerNow";
import {
  COIN_FLIP_DURATION_MS,
  COIN_SPINNER_DURATION_MS,
} from "../model/config";
import type {
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";
import type { DraftChoice } from "../model/types";

const choiceLabels: Record<DraftChoice, string> = {
  FIRST: "First Pick",
  SECOND: "Second Pick",
  RADIANT: "Radiant",
  DIRE: "Dire",
};

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
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  serverNow: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
}) {
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

  return (
    <section className="fearless-choice-screen">
      <div className="fearless-series-meta">
        <span>MAP {map.number} / {series.format}</span>
        <strong>Определение сторон и очередности</strong>
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
            {tossStage === "FLIPPING" && "Монетка делает несколько оборотов…"}
            {tossStage === "SPINNING" && "Волчок определяет победителя…"}
            {tossStage === "REVEALED" && (
              <><FiCheckCircle /> Монетку выиграл <strong>{firstChooser.name}</strong></>
            )}
          </p>
        </>
      )}

      {!hasCoinToss && (
        <p className="fearless-map-two-choice">
          На первой карте монетку проиграл <strong>{firstChooser.name}</strong>,
          поэтому на второй карте право первого выбора стороны или очереди пика
          досталось ему.
        </p>
      )}

      {isCoinRevealed && (
        <div className="fearless-decision-card">
          <div className="fearless-decision-player">
            <PlayerAvatar player={decisionPlayer} freezeAnimation />
            <div>
              <span>{isFirstDecision ? "Первый выбор" : "Ответный выбор"}</span>
              <strong>{decisionPlayer.name}</strong>
            </div>
          </div>
          {!isFirstDecision && map.firstChoice && (
            <p>
              {firstChooser.name} выбрал: <strong>{choiceLabels[map.firstChoice]}</strong>
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
              <i /> Ожидаем решение соперника
            </div>
          )}
        </div>
      )}
    </section>
  );
}
