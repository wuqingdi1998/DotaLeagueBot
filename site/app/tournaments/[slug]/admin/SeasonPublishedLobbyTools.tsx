"use client";

import { useState } from "react";
import { FiSettings } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonLobby } from "../model/season-types";
import { SeasonSubstitutionAdmin } from "./SeasonSubstitutionAdmin";

export function SeasonPublishedLobbyTools({ lobby }: { lobby: SeasonLobby }) {
  const { season } = useTournament();
  const match = lobby.matches[0];
  const [dotaMatchIds, setDotaMatchIds] = useState(() =>
    [1, 2].map(
      (gameNumber) =>
        match?.games.find((game) => game.game_number === gameNumber)
          ?.dota_match_id ?? "",
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  if (!season.data?.isOrganizer || !match) return null;

  async function saveMatchIds() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await season.mutate(
        "PATCH",
        {
          entity: "publishedLobby",
          matchId: match.id,
          dotaMatchIds,
        },
        `ID матчей для «${lobby.name}» сохранены`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <details className="season-published-lobby-tools">
      <summary>
        <FiSettings aria-hidden="true" /> Действия организатора
      </summary>
      <div className="season-published-match-ids">
        <h5>ID матчей лобби</h5>
        <p>После сохранения появятся ссылки на Stratz и DotaBuff.</p>
        <div>
          {dotaMatchIds.map((value, index) => (
            <label key={index}>
              <span>Матч {index + 1}</span>
              <input
                inputMode="numeric"
                value={value}
                onChange={(event) =>
                  setDotaMatchIds((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  )
                }
              />
            </label>
          ))}
          <button
            className="secondary-button"
            type="button"
            disabled={isSaving}
            onClick={() => void saveMatchIds()}
          >
            {isSaving ? "Сохраняем…" : "Сохранить ID"}
          </button>
        </div>
      </div>
      <SeasonSubstitutionAdmin match={match} />
    </details>
  );
}
