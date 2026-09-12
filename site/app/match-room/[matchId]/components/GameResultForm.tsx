"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { WinnerSide } from "../model/series";
import type { MatchRoomCommand, MatchRoomSnapshot } from "../model/types";

export function GameResultForm({
  snapshot,
  gameNumber,
  initialDotaMatchId = "",
  initialWinnerSide = "",
  eyebrow,
  title,
  description,
  submitLabel,
  isSending,
  createCommand,
  send,
}: {
  snapshot: MatchRoomSnapshot;
  gameNumber: number;
  initialDotaMatchId?: string;
  initialWinnerSide?: WinnerSide | "";
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  isSending: boolean;
  createCommand: (dotaMatchId: string, winnerSide: WinnerSide) => MatchRoomCommand;
  send: (command: MatchRoomCommand) => Promise<boolean>;
}) {
  const [dotaMatchId, setDotaMatchId] = useState(initialDotaMatchId);
  const [winnerSide, setWinnerSide] = useState<WinnerSide | "">(initialWinnerSide);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!winnerSide) return;
    await send(createCommand(dotaMatchId, winnerSide));
  }
  return (
    <form className="season-room-result-form" onSubmit={(event) => void submit(event)}>
      <header>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </header>
      <label className="season-room-match-id-field">
        <span>ID матча Dota 2</span>
        <input
          inputMode="numeric"
          pattern="[0-9]{5,20}"
          placeholder="Например, 8123456789"
          value={dotaMatchId}
          onChange={(event) => setDotaMatchId(event.target.value.replace(/\D/g, ""))}
          required
        />
      </label>
      <fieldset>
        <legend>Победитель карты</legend>
        {(["a", "b"] as const).map((side) => (
          <label key={side}>
            <input
              type="radio"
              name={`winner-${gameNumber}`}
              value={side}
              checked={winnerSide === side}
              onChange={() => setWinnerSide(side)}
              required
            />
            <span>{side === "a" ? snapshot.teamAName : snapshot.teamBName}</span>
          </label>
        ))}
      </fieldset>
      <footer>
        <button className="primary-button" disabled={isSending || !winnerSide || !dotaMatchId}>
          {submitLabel}
        </button>
      </footer>
    </form>
  );
}
