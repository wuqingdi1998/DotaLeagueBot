"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import type {
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";
import type { DraftChoice } from "../model/types";
import { PlayerAvatar } from "../components/PlayerAvatar";

const choiceLabels: Record<DraftChoice, string> = {
  FIRST: "First Pick",
  SECOND: "Second Pick",
  RADIANT: "Radiant",
  DIRE: "Dire",
};

export function DraftChoices({
  series,
  userId,
  isSending,
  send,
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
}) {
  const [isCoinRevealed, setIsCoinRevealed] = useState(false);
  const { map } = series;
  useEffect(() => {
    const timer = window.setTimeout(() => setIsCoinRevealed(true), 1_500);
    return () => window.clearTimeout(timer);
  }, [map.id]);

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

  return (
    <section className="fearless-choice-screen">
      <div className="fearless-series-meta">
        <span>MAP {map.number} / {series.format}</span>
        <strong>Определение сторон и очередности</strong>
      </div>
      <div className={`fearless-coin ${isCoinRevealed ? "revealed" : "spinning"}`}>
        <div><span>LS</span></div>
      </div>
      <p className="fearless-coin-result">
        {hasCoinToss ? (
          isCoinRevealed
            ? <><FiCheckCircle /> Монетку выиграл <strong>{firstChooser.name}</strong></>
            : "Монетка решает, кто выбирает первым…"
        ) : (
          <>На второй карте первым выбирает <strong>{firstChooser.name}</strong></>
        )}
      </p>

      {(!hasCoinToss || isCoinRevealed) && (
        <div className="fearless-decision-card">
          <div className="fearless-decision-player">
            <PlayerAvatar player={decisionPlayer} />
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
