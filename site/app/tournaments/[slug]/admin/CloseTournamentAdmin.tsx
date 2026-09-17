"use client";

import { useState, type FormEvent } from "react";
import { closeGameFormats, type CloseGameFormat } from "@/lib/close-tournament";
import { fetchSiteRequest } from "@/lib/site-request";
import { useTournament } from "../hooks/TournamentContext";
import { SeasonLobbyList } from "../sections/SeasonLobbyDisplay";
import { SeasonLobbyBuilder } from "./SeasonLobbyBuilder";
import { SeasonLobbyHostButton } from "./SeasonLobbyHostButton";
import { SeasonPublishedLobbyTools } from "./SeasonPublishedLobbyTools";

export function CloseTournamentAdmin() {
  const { data, loadData, season, setToast } = useTournament();
  const [format, setFormat] = useState<CloseGameFormat>(
    closeGameFormats.includes(data?.tournament.format as CloseGameFormat)
      ? data?.tournament.format as CloseGameFormat
      : "CM",
  );
  const [bestOf, setBestOf] = useState(Number(data?.tournament.close_series ?? 2));
  const [isSaving, setIsSaving] = useState(false);
  const round = season.data?.rounds[0];
  if (!data?.tournament.close_event_id) return null;

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetchSiteRequest("/api/admin/close-tournament", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId: data!.tournament.id, format, bestOf }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setToast(result.error ?? "Не удалось сохранить формат клоза");
        return;
      }
      setToast("Формат клоза сохранён");
      await Promise.all([loadData(), season.load()]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="applications-panel close-settings-panel">
        <div className="editor-heading">
          <div>
            <p className="card-kicker">Один матч</p>
            <h3>Формат клоза</h3>
            <p>Настройки применятся к странице и игровому лобби.</p>
          </div>
        </div>
        <form className="close-settings-form" onSubmit={saveSettings}>
          <label>
            <span>Режим игры</span>
            <select
              value={format}
              onChange={(event) => {
                const nextFormat = event.target.value as CloseGameFormat;
                setFormat(nextFormat);
                if (nextFormat === "Fearless Draft" && bestOf === 1) setBestOf(2);
              }}
            >
              {closeGameFormats.map((value) => (
                <option value={value} key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Количество карт</span>
            <select value={bestOf} onChange={(event) => setBestOf(Number(event.target.value))}>
              {format !== "Fearless Draft" && <option value={1}>BO1</option>}
              <option value={2}>BO2</option>
              <option value={3}>BO3</option>
            </select>
          </label>
          <button className="primary-button compact" type="submit" disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Сохранить формат"}
          </button>
        </form>
      </section>

      {!round ? (
        <div className="empty-standings">Загружаем участников клоза…</div>
      ) : (
        <>
          <SeasonLobbyBuilder round={round} singleLobby />
          {round.lobby_configuration_status === "published" && (
            <section className="applications-panel close-match-admin">
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">Опубликованный матч</p>
                  <h3>Хост и результат</h3>
                </div>
              </div>
              <SeasonLobbyList
                round={round}
                isArchived={false}
                lobbyFooter={(lobby) => (
                  <SeasonPublishedLobbyTools
                    lobby={lobby}
                    showSubstitutions={false}
                  />
                )}
                participantAction={(match, player) => (
                  <SeasonLobbyHostButton match={match} player={player} />
                )}
              />
            </section>
          )}
        </>
      )}
    </>
  );
}
