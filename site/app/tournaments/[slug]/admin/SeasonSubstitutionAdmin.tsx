"use client";

import { useState } from "react";
import { FiEdit3, FiTrash2 } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonMatch } from "../model/season-types";
import { canSubstituteOnSecondMap } from "@/lib/season-substitution";
import {
  SeasonAdminPlayerPicker,
  type SeasonAdminPlayerOption,
} from "./SeasonAdminPlayerPicker";
import { SeasonLobbyHostButton } from "./SeasonLobbyHostButton";

export function SeasonSubstitutionAdmin({ match }: { match: SeasonMatch }) {
  const { season } = useTournament();
  const [gameNumber, setGameNumber] = useState("");
  const [outgoingPlayerId, setOutgoingPlayerId] = useState("");
  const [incomingPlayer, setIncomingPlayer] =
    useState<SeasonAdminPlayerOption | null>(null);
  const [note, setNote] = useState("");
  const [pickerRevision, setPickerRevision] = useState(0);
  const [editingSubstitutionId, setEditingSubstitutionId] =
    useState<number | null>(null);
  const canUseSecondMap = match.best_of >= 2 && canSubstituteOnSecondMap(match.games);

  function resetForm() {
    setGameNumber("");
    setOutgoingPlayerId("");
    setIncomingPlayer(null);
    setNote("");
    setEditingSubstitutionId(null);
    setPickerRevision((current) => current + 1);
  }

  async function saveSubstitution() {
    const result = await season.mutate(editingSubstitutionId ? "PATCH" : "POST", {
      entity: "substitution",
      id: editingSubstitutionId,
      matchId: match.id,
      gameNumber: gameNumber || null,
      outgoingPlayerId,
      incomingPlayerId: incomingPlayer?.discord_id,
      note,
    });
    if (result.ok) resetForm();
  }

  function editSubstitution(substitution: SeasonMatch["substitutions"][number]) {
    setGameNumber(substitution.game_number === 2 ? "2" : "");
    setOutgoingPlayerId(substitution.outgoing_player_id);
    setIncomingPlayer({
      discord_id: substitution.incoming_player_id,
      dota_id: substitution.incoming_dota_id,
      nickname: substitution.incoming_nickname,
      tier: null,
    });
    setNote(substitution.note ?? "");
    setEditingSubstitutionId(substitution.id);
    setPickerRevision((current) => current + 1);
  }

  return (
    <section className="season-substitution-admin">
      <div>
        <h4>Замены игроков</h4>
        <p>
          До первой карты новый игрок считается полноценным участником без
          штрафа. Замена на второй карте даёт выбывшему техническое поражение,
          5 огоньков и пропуск следующего тура; новый игрок получает +1 p только
          при победе своей команды на второй карте. Оформить её можно после
          сохранения хостом победителя и ID первой карты. Новый игрок сразу
          получает доступ в комнату и драфт своей команды.
        </p>
      </div>
      <div className="season-inline-admin-form">
        <label>
          <span>Когда произошла замена</span>
          <select value={gameNumber} onChange={(event) => setGameNumber(event.target.value)}>
            <option value="">До первой карты – полноценный игрок</option>
            {canUseSecondMap && (
              <option value="2">На второй карте – со штрафом</option>
            )}
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
          initialValue={incomingPlayer?.nickname}
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
        <button
          className="secondary-button"
          type="button"
          disabled={!outgoingPlayerId || !incomingPlayer}
          onClick={() => void saveSubstitution()}
        >
          {editingSubstitutionId ? "Сохранить замену" : "Добавить замену"}
        </button>
        {editingSubstitutionId && (
          <button className="secondary-button" type="button" onClick={resetForm}>
            Отмена
          </button>
        )}
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
              <div className="season-substitution-record-actions">
                <button
                  className="secondary-button"
                  type="button"
                  aria-label="Изменить замену"
                  onClick={() => editSubstitution(substitution)}
                >
                  <FiEdit3 />
                </button>
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
              </div>
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
