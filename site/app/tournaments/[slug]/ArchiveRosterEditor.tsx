"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { FormEvent, useMemo, useState } from "react";
import { PlayerAutocomplete } from "./components/PlayerAutocomplete";
import { CompactTeamEmblem } from "./components/CompactTeamEmblem";

const roles = [
  ["safe_lane", "1 · Safe Lane"],
  ["mid_lane", "2 · Mid Lane"],
  ["off_lane", "3 · Off Lane"],
  ["soft_support", "4 · Soft Support"],
  ["hard_support", "5 · Hard Support"],
] as const;

type Role = (typeof roles)[number][0];
type RosterRole = Role | "coach";
type EditorPlayer = {
  role: RosterRole;
  nickname: string;
  dotaId: string;
  tier: string;
  isCaptain: boolean;
};
type ExistingTeam = {
  id: number;
  team_name: string;
  tag: string;
  contact: string;
  logo_key?: string | null;
  selection_method?: string;
  team_tier_total_snapshot?: number | null;
  members: Array<{
    dota_id?: string | null;
    name: string;
    role: RosterRole;
    tier_snapshot?: number | null;
    is_captain: boolean;
  }>;
};

type Props = {
  tournamentId: number;
  team?: ExistingTeam;
  isHistorical?: boolean;
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
};

export function ArchiveRosterEditor({
  tournamentId,
  team,
  isHistorical = true,
  onSaved,
  onMessage,
}: Props) {
  const initialPlayers = useMemo<EditorPlayer[]>(
    () => {
      const playingRoster = roles.map(([role]) => {
        const member = team?.members.find((item) => item.role === role);
        return {
          role,
          nickname: member?.name ?? "",
          dotaId: member?.dota_id ?? "",
          tier: member?.tier_snapshot?.toString() ?? "",
          isCaptain: member?.is_captain ?? role === "safe_lane",
        };
      });
      const coach = team?.members.find((item) => item.role === "coach");
      return coach
        ? [...playingRoster, {
            role: "coach" as const,
            nickname: coach.name,
            dotaId: coach.dota_id ?? "",
            tier: coach.tier_snapshot?.toString() ?? "",
            isCaptain: false,
          }]
        : playingRoster;
    },
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
  const [emblem, setEmblem] = useState<File | null>(null);
  const [emblemInputKey, setEmblemInputKey] = useState(0);

  const scoringPlayers = players.filter((player) => player.role !== "coach");
  const profileTierTotal = scoringPlayers.every((player) => player.tier !== "")
    ? scoringPlayers.reduce((sum, player) => sum + Number(player.tier), 0) : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const roster = JSON.stringify({
        applicationId: team?.id,
        tournamentId,
        teamName,
        tag,
        selectionMethod,
        useProfileTiers: !isHistorical,
        teamTierTotal: isHistorical ? (teamTierTotal ? Number(teamTierTotal) : null) : profileTierTotal,
        players: players.map((player) => ({
          ...player,
          dotaId: player.dotaId.trim() || null,
          tier: player.tier ? Number(player.tier) : null,
        })),
      });
      const form = new FormData();
      form.set("roster", roster);
      if (emblem) form.set("emblem", emblem);
      const response = await fetchSiteRequest("/api/admin/archive-rosters", {
        method: "PUT",
        headers: emblem ? undefined : { "content-type": "application/json" },
        body: emblem ? form : roster,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        onMessage(result.error ?? "Не удалось сохранить состав");
        return;
      }
      onMessage(team ? "Состав обновлён" : "Команда добавлена");
      await onSaved();
      setEmblem(null);
      setEmblemInputKey((current) => current + 1);
      if (!team) {
        setTeamName("");
        setTag("");
        setTeamTierTotal("");
        setPlayers(initialPlayers);
      }
    } catch {
      onMessage("Не удалось сохранить состав. Проверьте соединение и повторите попытку.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTeam() {
    if (!team || !window.confirm(`Удалить команду ${team.team_name}?`)) return;
    const response = await fetchSiteRequest(`/api/admin/archive-rosters?id=${team.id}`, {
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
            maxLength={80}
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
            readOnly={!isHistorical}
            value={isHistorical ? teamTierTotal : profileTierTotal ?? ""}
            onChange={(event) => setTeamTierTotal(event.target.value)}
          />
        </label>
      </div>
      <div className="roster-emblem-field">
        <CompactTeamEmblem className="roster-logo" logoKey={team?.logo_key} teamName={teamName || "Команда"} />
        <label>
          <span>Логотип команды (необязательно)</span>
          <input
            key={emblemInputKey}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setEmblem(event.target.files?.[0] ?? null)}
          />
          <small>PNG, JPG или WebP, до 2 МБ. Можно добавить или заменить позже.</small>
        </label>
      </div>
      <div className="archive-roster-actions">
        <button className="secondary-button" type="button" onClick={() => setPlayers((current) =>
          current.some((player) => player.role === "coach")
            ? current.filter((player) => player.role !== "coach")
            : [...current, { role: "coach", nickname: "", dotaId: "", tier: "", isCaptain: false }],
        )}>
          {players.some((player) => player.role === "coach") ? "Убрать тренера" : "Добавить тренера"}
        </button>
      </div>
      <div className="archive-roster-players">
        {players.map((player, index) => (
          <div className={`archive-player-row${isHistorical ? "" : " roster-profile-row"}`} key={player.role}>
            <strong>{player.role === "coach" ? "Тренер" : roles[index][1]}</strong>
            {!isHistorical ? <PlayerAutocomplete
              label={`Никнейм, ${player.role === "coach" ? "тренер" : roles[index][1]}`}
              value={player.nickname}
              onChange={(nickname) => setPlayers((current) => current.map((item, i) => i === index ? { ...item, nickname, dotaId: "", tier: "" } : item))}
              onSelected={(option) => setPlayers((current) => current.map((item, i) => i === index ? { ...item, nickname: option.ingame_name, dotaId: option.dota_id ?? "" } : item))}
              onTierResolved={(tier) => setPlayers((current) => current.map((item, i) => i === index ? { ...item, tier: tier === null ? "" : String(tier) } : item))}
            /> : (
            <input
              required
              maxLength={100}
              aria-label={`Никнейм, ${player.role === "coach" ? "тренер" : roles[index][1]}`}
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
            )}
            <input
              type="number"
              min="0"
              max="12"
              aria-label={`${isHistorical ? "Исторический тир" : "Тир"}, ${player.role === "coach" ? "тренер" : roles[index][1]}`}
              readOnly={!isHistorical}
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
            {isHistorical && <label className="archive-player-profile-link">
              <span>Dota ID профиля</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                aria-label={`Dota ID профиля, ${player.role === "coach" ? "тренер" : roles[index][1]}`}
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
            </label>}
            {player.role !== "coach" && <label className="archive-captain-choice">
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
            </label>}
          </div>
        ))}
      </div>
      <div className="archive-roster-actions">
        <button
          className={team ? "primary-button tournament-save-button" : "primary-button"}
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
          <button className="secondary-button danger" type="button" onClick={removeTeam}>
            Удалить команду
          </button>
        )}
      </div>
    </form>
  );
}
