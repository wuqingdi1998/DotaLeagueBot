"use client";

import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonMatch } from "../model/season-types";
import {
  SeasonAdminPlayerPicker,
  type SeasonAdminPlayerOption,
} from "./SeasonAdminPlayerPicker";
import { SeasonLobbyHostButton } from "./SeasonLobbyHostButton";

export function SeasonSubstitutionAdmin({ match }: { match: SeasonMatch }) {
  const { season } = useTournament();
  const [gameId, setGameId] = useState("");
  const [outgoingPlayerId, setOutgoingPlayerId] = useState("");
  const [incomingPlayer, setIncomingPlayer] =
    useState<SeasonAdminPlayerOption | null>(null);
  const [technicalLoss, setTechnicalLoss] = useState(true);
  const [note, setNote] = useState("");
  const [pickerRevision, setPickerRevision] = useState(0);

  async function addSubstitution() {
    const result = await season.mutate("POST", {
      entity: "substitution",
      matchId: match.id,
      gameId: gameId || null,
      outgoingPlayerId,
      incomingPlayerId: incomingPlayer?.discord_id,
      technicalLoss,
      note,
    });
    if (result.ok) {
      setIncomingPlayer(null);
      setPickerRevision((current) => current + 1);
      setNote("");
    }
  }

  return (
    <section className="season-substitution-admin">
      <div>
        <h4>Замены по ходу матча</h4>
        <p>
          Укажите карту, выбывшего игрока и ID игрока замены. При победе
          заменивший игрок автоматически получит +1 в столбец p.
        </p>
      </div>
      <div className="season-inline-admin-form">
        <label>
          <span>Карта</span>
          <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
            <option value="">Весь матч</option>
            {match.games.map((game) => (
              <option value={game.id} key={game.id}>
                Карта {game.game_number}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Кого заменили</span>
          <select
            value={outgoingPlayerId}
            onChange={(event) => setOutgoingPlayerId(event.target.value)}
          >
            <option value="">Выберите игрока</option>
            {match.participants.map((player) => (
              <option value={player.player_id} key={player.player_id}>
                {player.nickname} · команда {player.team_side.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <SeasonAdminPlayerPicker
          key={pickerRevision}
          label="Кто выходит на замену"
          onSelect={setIncomingPlayer}
        />
        <label>
          <span>Комментарий</span>
          <input
            value={note}
            placeholder="Например: проблемы с интернетом"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <label className="season-technical-loss-field">
          <input
            type="checkbox"
            checked={technicalLoss}
            onChange={(event) => setTechnicalLoss(event.target.checked)}
          />
          <span>Выбывшему игроку — техническое поражение и 0 очков</span>
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={!outgoingPlayerId || !incomingPlayer}
          onClick={() => void addSubstitution()}
        >
          Добавить замену
        </button>
      </div>
      {match.substitutions.length > 0 && (
        <div className="season-admin-record-list">
          {match.substitutions.map((substitution) => (
            <article key={substitution.id}>
              <div>
                <strong>
                  {substitution.outgoing_nickname} →{" "}
                  {substitution.incoming_nickname}
                </strong>
                <span>
                  {substitution.game_number
                    ? `Карта ${substitution.game_number}`
                    : "Весь матч"}
                  {substitution.note ? ` · ${substitution.note}` : ""}
                </span>
              </div>
              <button
                className="danger-button"
                type="button"
                aria-label="Удалить замену"
                onClick={() =>
                  void season.mutate("DELETE", {
                    entity: "substitution",
                    id: substitution.id,
                  })
                }
              >
                <FiTrash2 />
              </button>
              {!substitution.game_number && (
                <SeasonLobbyHostButton
                  match={match}
                  player={{
                    player_id: substitution.incoming_player_id,
                    nickname: substitution.incoming_nickname,
                    is_host:
                      match.host_player_id === substitution.incoming_player_id,
                  }}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
