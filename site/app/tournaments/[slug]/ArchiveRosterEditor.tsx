"use client";

import { FormEvent, useMemo, useState } from "react";

const roles = [
  ["safe_lane", "1 · Safe Lane"],
  ["mid_lane", "2 · Mid Lane"],
  ["off_lane", "3 · Off Lane"],
  ["soft_support", "4 · Soft Support"],
  ["hard_support", "5 · Hard Support"],
] as const;

type Role = (typeof roles)[number][0];
type ExistingTeam = {
  id: number;
  team_name: string;
  tag: string;
  contact: string;
  selection_method?: string;
  team_tier_total_snapshot?: number | null;
  members: Array<{
    dota_id?: string | null;
    name: string;
    role: Role;
    tier_snapshot?: number | null;
    is_captain: boolean;
  }>;
};

type Props = {
  tournamentId: number;
  team?: ExistingTeam;
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
};

export function ArchiveRosterEditor({
  tournamentId,
  team,
  onSaved,
  onMessage,
}: Props) {
  const initialPlayers = useMemo(
    () =>
      roles.map(([role]) => {
        const member = team?.members.find((item) => item.role === role);
        return {
          role,
          nickname: member?.name ?? "",
          dotaId: member?.dota_id ?? "",
          tier: member?.tier_snapshot?.toString() ?? "",
          isCaptain: member?.is_captain ?? role === "safe_lane",
        };
      }),
    [team],
  );
  const [teamName, setTeamName] = useState(team?.team_name ?? "");
  const [tag, setTag] = useState(team?.tag ?? "");
  const [selectionMethod, setSelectionMethod] = useState(
    team?.selection_method ?? "Регистрация",
  );
  const [teamTierTotal, setTeamTierTotal] = useState(
    team?.team_tier_total_snapshot?.toString() ?? "",
  );
  const [players, setPlayers] = useState(initialPlayers);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/archive-rosters", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: team?.id,
        tournamentId,
        teamName,
        tag,
        selectionMethod,
        teamTierTotal: teamTierTotal ? Number(teamTierTotal) : null,
        players: players.map((player) => ({
          ...player,
          dotaId: player.dotaId.trim() || null,
          tier: player.tier ? Number(player.tier) : null,
        })),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      onMessage(result.error ?? "Не удалось сохранить состав");
      return;
    }
    onMessage(team ? "Архивный состав обновлён" : "Архивная команда добавлена");
    await onSaved();
  }

  async function removeTeam() {
    if (!team || !window.confirm(`Удалить команду ${team.team_name}?`)) return;
    const response = await fetch(`/api/admin/archive-rosters?id=${team.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      onMessage(result.error ?? "Не удалось удалить команду");
      return;
    }
    onMessage("Команда удалена");
    await onSaved();
  }

  return (
    <form className="archive-roster-editor" onSubmit={submit}>
      <div className="archive-roster-team-fields">
        <label>
          <span>Название команды</span>
          <input
            required
            maxLength={20}
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
        </label>
        <label>
          <span>Тег</span>
          <input
            required
            maxLength={5}
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          />
        </label>
        <label>
          <span>Метод участия</span>
          <input
            required
            maxLength={80}
            value={selectionMethod}
            onChange={(event) => setSelectionMethod(event.target.value)}
          />
        </label>
        <label>
          <span>Суммарный тир команды</span>
          <input
            type="number"
            min="0"
            max="100"
            value={teamTierTotal}
            onChange={(event) => setTeamTierTotal(event.target.value)}
          />
        </label>
      </div>
      <div className="archive-roster-players">
        {players.map((player, index) => (
          <div className="archive-player-row" key={player.role}>
            <strong>{roles[index][1]}</strong>
            <input
              required
              maxLength={100}
              aria-label={`Никнейм, ${roles[index][1]}`}
              placeholder="Никнейм"
              value={player.nickname}
              onChange={(event) =>
                setPlayers((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, nickname: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <input
              type="number"
              min="0"
              max="12"
              aria-label={`Исторический тир, ${roles[index][1]}`}
              placeholder="Тир"
              value={player.tier}
              onChange={(event) =>
                setPlayers((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, tier: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <label className="archive-player-profile-link">
              <span>Dota ID профиля</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                aria-label={`Dota ID профиля, ${roles[index][1]}`}
                placeholder="Без ссылки"
                value={player.dotaId}
                onChange={(event) =>
                  setPlayers((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            dotaId: event.target.value.replace(/\D/g, ""),
                          }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label className="archive-captain-choice">
              <input
                type="radio"
                name={`captain-${team?.id ?? "new"}`}
                checked={player.isCaptain}
                onChange={() =>
                  setPlayers((current) =>
                    current.map((item, itemIndex) => ({
                      ...item,
                      isCaptain: itemIndex === index,
                    })),
                  )
                }
              />
              Капитан
            </label>
          </div>
        ))}
      </div>
      <div className="archive-roster-actions">
        <button
          className={team ? "tournament-save-button" : undefined}
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Сохраняем…"
            : team
              ? "Сохранить состав"
              : "Добавить команду"}
        </button>
        {team && (
          <button className="danger" type="button" onClick={removeTeam}>
            Удалить команду
          </button>
        )}
      </div>
    </form>
  );
}
