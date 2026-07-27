"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FaCrown, FaDiscord, FaHandHoldingMedical } from "react-icons/fa";
import { FiArrowRight, FiArrowUpRight, FiUploadCloud } from "react-icons/fi";
import { GiBoltShield, GiBowArrow, GiFlame, GiSwordWound } from "react-icons/gi";
import { SiteHeader } from "@/app/components/SiteHeader";
import { matchUsesBracketRouting } from "@/lib/bracket";
import { isPastTournament } from "@/lib/tournaments";
import {
  groupOutcome,
  groupOutcomeLabel,
} from "@/lib/group-advancement";
import { OrganizerAccess } from "../OrganizerAccess";
import { ArchiveRosterEditor } from "./ArchiveRosterEditor";
import { TournamentBracket } from "./TournamentBracket";
import { TournamentContentEditor } from "./TournamentContentEditor";

type PlayerRole =
  | "safe_lane"
  | "mid_lane"
  | "off_lane"
  | "soft_support"
  | "hard_support";

type Tournament = {
  id: number;
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  headline_accent: string;
  description: string;
  about: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  status_label: string;
  format: string;
  team_size: number;
  max_teams: number;
  region: string;
  server: string;
  check_in_minutes: number;
  group_format: string;
  playoff_format: string;
  final_format: string;
  playoff_type: "single_elimination" | "double_elimination";
  discord_url: string;
  status: "draft" | "registration" | "active" | "finished" | "archived";
  updated_at: string;
};

type TeamApplication = {
  id: number;
  tournament_id: number;
  team_name: string;
  tag: string;
  captain: string;
  contact: string;
  player_2: string;
  player_3: string;
  player_4: string;
  player_5: string;
  captain_role: PlayerRole;
  player_2_role: PlayerRole;
  player_3_role: PlayerRole;
  player_4_role: PlayerRole;
  player_5_role: PlayerRole;
  logo_key: string | null;
  selection_method: string;
  team_tier_total_snapshot: number | null;
  placement: number | null;
  result_label: string | null;
  status: "approved" | "pending" | "awaiting_members" | "declined" | "withdrawn";
  created_at: string;
  members: Array<{
    discord_id: string | null;
    dota_id: string | null;
    name: string;
    role: PlayerRole;
    is_captain: boolean;
    invitation_status: "invited" | "accepted" | "declined";
    tier_snapshot: number | null;
  }>;
};

type Match = {
  id: number;
  tournament_id: number;
  group_id: number | null;
  scheduled_at: string;
  stage: string;
  team_a: string;
  team_b: string;
  team_a_application_id: number | null;
  team_b_application_id: number | null;
  team_a_placeholder: string | null;
  team_b_placeholder: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  result_type: "normal" | "technical" | "forfeit" | "cancelled";
  team_a_result_label: string | null;
  team_b_result_label: string | null;
  decision_note: string | null;
  bracket_round: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
  bracket_slot: number | null;
  bracket_grid_column: number | null;
  bracket_grid_row: number | null;
  eliminated_team_application_id: number | null;
  winner_to_match_id: number | null;
  winner_to_slot: "a" | "b" | null;
  loser_to_match_id: number | null;
  loser_to_slot: "a" | "b" | null;
  best_of: number;
  sort_order: number;
  status: "scheduled" | "ready" | "live" | "finished" | "cancelled";
  team_a_checked_in: boolean;
  team_b_checked_in: boolean;
};

type Standing = {
  id: number;
  tournament_id: number;
  group_id: number;
  application_id: number;
  group_name: string;
  place: number;
  team_name: string;
  games: number;
  maps_won: number;
};

type TournamentGroup = {
  id: number;
  tournament_id: number;
  name: string;
  sort_order: number;
  explanation: string | null;
  team_capacity: number;
  advance_to_playoff: number;
  advance_to_upper: number;
  advance_to_lower: number;
};

type TournamentScheduleDay = {
  id: number;
  tournament_id: number;
  day_date: string;
  title: string | null;
  sort_order: number;
  entries: Array<{
    id: number;
    day_id: number;
    start_time: string;
    stage_name: string;
    match_count: number;
    series_format: string;
    sort_order: number;
  }>;
};

type SiteData = {
  tournament: Tournament;
  applications: TeamApplication[];
  matches: Match[];
  standings: Standing[];
  groups: TournamentGroup[];
  rules: Array<{
    id: number;
    tournament_id: number;
    sort_order: number;
    rule_text: string;
  }>;
  prizes: Array<{
    id: number;
    tournament_id: number;
    placement: number;
    application_id: number | null;
    team_name: string;
    prize_text: string | null;
  }>;
  scheduleDays: TournamentScheduleDay[];
  user: {
    discordId: string;
    dotaId: string;
    username: string;
    avatarUrl: string | null;
    playerName: string;
    realName: string | null;
    positions: string | null;
    serverName: string;
    isAdmin: boolean;
  } | null;
  invitations: Array<{
    application_id: number;
    team_name: string;
    tag: string;
    role: PlayerRole;
    invitation_status: "invited";
  }>;
};

type MatchDraft = {
  groupId: string;
  scheduledAt: string;
  stage: string;
  teamAId: string;
  teamBId: string;
  teamAPlaceholder: string;
  teamBPlaceholder: string;
  bestOf: string;
  bracketSide: string;
  bracketRound: string;
  bracketSlot: string;
};

type RegistrationForm = {
  team_name: string;
  tag: string;
  captain: string;
  contact: string;
  player_2: string;
  player_3: string;
  player_4: string;
  player_5: string;
  captain_role: PlayerRole;
  player_2_role: PlayerRole;
  player_3_role: PlayerRole;
  player_4_role: PlayerRole;
  player_5_role: PlayerRole;
  rulesAccepted: boolean;
};

const roleOptions: Array<{ value: PlayerRole; label: string; position: number }> = [
  { value: "safe_lane", label: "Safe Lane", position: 1 },
  { value: "mid_lane", label: "Mid Lane", position: 2 },
  { value: "off_lane", label: "Off Lane", position: 3 },
  { value: "soft_support", label: "Soft Support", position: 4 },
  { value: "hard_support", label: "Hard Support", position: 5 },
];

const emptyRegistration: RegistrationForm = {
  team_name: "",
  tag: "",
  captain: "",
  contact: "",
  player_2: "",
  player_3: "",
  player_4: "",
  player_5: "",
  captain_role: "safe_lane",
  player_2_role: "mid_lane",
  player_3_role: "off_lane",
  player_4_role: "soft_support",
  player_5_role: "hard_support",
  rulesAccepted: false,
};

const emptyMatchDraft: MatchDraft = {
  groupId: "",
  scheduledAt: "",
  stage: "Групповой этап",
  teamAId: "",
  teamBId: "",
  teamAPlaceholder: "",
  teamBPlaceholder: "",
  bestOf: "1",
  bracketSide: "",
  bracketRound: "",
  bracketSlot: "",
};

const editableTournamentFields = [
  "name",
  "eyebrow",
  "headline",
  "headline_accent",
  "description",
  "about",
  "status_label",
  "format",
  "region",
  "server",
  "group_format",
  "playoff_format",
  "final_format",
  "discord_url",
] as const;

const editableTournamentFieldLabels: Record<
  (typeof editableTournamentFields)[number],
  string
> = {
  name: "Название турнира",
  eyebrow: "Строка над заголовком",
  headline: "Главный заголовок",
  headline_accent: "Голубая часть заголовка",
  description: "Краткое описание",
  about: "Полное описание",
  status_label: "Статус",
  format: "Формат",
  region: "Регион",
  server: "Игровой сервер",
  group_format: "Групповой этап",
  playoff_format: "Описание плей-офф",
  final_format: "Гранд-финал",
  discord_url: "Ссылка Discord",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTeamNameError(value: string) {
  const name = value.trim();
  if (!name) return "Введите название команды";
  if (name.length > 20) return "Не более 20 символов";
  if (!/[A-Za-zА-Яа-яЁё]/.test(name)) return "Добавьте русские или английские буквы";
  if (!/^[A-Za-zА-Яа-яЁё !\"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/.test(name)) {
    return "Разрешены буквы и обычные символы клавиатуры";
  }
  if ((name.match(/[^A-Za-zА-Яа-яЁё]/g) ?? []).length > 2) {
    return "Можно использовать не более двух специальных символов";
  }
  return "";
}

function formatDayMonth(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

function toDateTimeInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string) {
  return `${value}:00+03:00`;
}

function getTeamPlayers(team: TeamApplication) {
  const players = team.members.length
    ? team.members.map((member) => ({
        name: member.name,
        role: member.role,
        isCaptain: member.is_captain,
        dotaId: member.dota_id,
        tier: member.tier_snapshot,
      }))
    : [
        { name: team.captain, role: team.captain_role, isCaptain: true, dotaId: null, tier: null },
        { name: team.player_2, role: team.player_2_role, isCaptain: false, dotaId: null, tier: null },
        { name: team.player_3, role: team.player_3_role, isCaptain: false, dotaId: null, tier: null },
        { name: team.player_4, role: team.player_4_role, isCaptain: false, dotaId: null, tier: null },
        { name: team.player_5, role: team.player_5_role, isCaptain: false, dotaId: null, tier: null },
      ];

  return players.sort(
    (a, b) =>
      roleOptions.findIndex((role) => role.value === a.role) -
      roleOptions.findIndex((role) => role.value === b.role),
  );
}

function RoleIcon({ role }: { role: PlayerRole }) {
  const details = roleOptions.find((option) => option.value === role) ?? roleOptions[0];
  const icon = {
    safe_lane: <GiSwordWound aria-hidden="true" />,
    mid_lane: <GiBowArrow aria-hidden="true" />,
    off_lane: <GiBoltShield aria-hidden="true" />,
    soft_support: <GiFlame aria-hidden="true" />,
    hard_support: <FaHandHoldingMedical aria-hidden="true" />,
  }[role];

  return (
    <span
      className={`role-icon role-${role}`}
      aria-label={`${details.position}-я позиция, ${details.label}`}
      title={`${details.position}-я позиция · ${details.label}`}
    >
      {icon}
    </span>
  );
}

function RoleSelect({
  value,
  onChange,
  label = "Роль",
}: {
  value: PlayerRole;
  onChange: (value: PlayerRole) => void;
  label?: string;
}) {
  return (
    <label className="role-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as PlayerRole)}>
        {roleOptions.map((role) => (
          <option key={role.value} value={role.value}>
            {role.position} · {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatMatchCount(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} матчей`;
  if (last === 1) return `${value} матч`;
  if (last >= 2 && last <= 4) return `${value} матча`;
  return `${value} матчей`;
}

function GroupSettingsEditor({
  group,
  playoffType,
  onSaved,
  onMessage,
}: {
  group: TournamentGroup;
  playoffType: Tournament["playoff_type"];
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
}) {
  const [teamCapacity, setTeamCapacity] = useState(group.team_capacity);
  const [advanceToPlayoff, setAdvanceToPlayoff] = useState(
    group.advance_to_playoff,
  );
  const [advanceToUpper, setAdvanceToUpper] = useState(
    group.advance_to_upper,
  );
  const [advanceToLower, setAdvanceToLower] = useState(
    group.advance_to_lower,
  );
  const [explanation, setExplanation] = useState(group.explanation ?? "");
  const [saving, setSaving] = useState(false);
  const advancing =
    playoffType === "double_elimination"
      ? advanceToUpper + advanceToLower
      : advanceToPlayoff;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/groups", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        groupId: group.id,
        teamCapacity,
        advanceToPlayoff,
        advanceToUpper,
        advanceToLower,
        explanation,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      onMessage(result.error ?? "Не удалось сохранить настройки группы");
      return;
    }
    onMessage(`Настройки ${group.name} сохранены`);
    await onSaved();
  }

  return (
    <form className="group-settings-editor" onSubmit={save}>
      <div className="group-settings-heading">
        <div>
          <strong>Настройки {group.name}</strong>
          <span>
            {playoffType === "double_elimination"
              ? "Double Elimination"
              : "Single Elimination"}
          </span>
        </div>
      </div>
      <div className="group-settings-grid">
        <label>
          <span>Команд в группе</span>
          <input
            type="number"
            min="3"
            max="8"
            value={teamCapacity}
            onChange={(event) => setTeamCapacity(Number(event.target.value))}
          />
        </label>
        {playoffType === "double_elimination" ? (
          <>
            <label>
              <span>Выходят в верхнюю сетку</span>
              <input
                type="number"
                min="0"
                max={teamCapacity}
                value={advanceToUpper}
                onChange={(event) =>
                  setAdvanceToUpper(Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Выходят в нижнюю сетку</span>
              <input
                type="number"
                min="0"
                max={teamCapacity}
                value={advanceToLower}
                onChange={(event) =>
                  setAdvanceToLower(Number(event.target.value))
                }
              />
            </label>
          </>
        ) : (
          <label>
            <span>Выходят в плей-офф</span>
            <input
              type="number"
              min="1"
              max={teamCapacity}
              value={advanceToPlayoff}
              onChange={(event) =>
                setAdvanceToPlayoff(Number(event.target.value))
              }
            />
          </label>
        )}
        {playoffType === "double_elimination" && (
          <label>
            <span>Всего выходят в плей-офф</span>
            <input readOnly value={advancing} />
          </label>
        )}
        <label>
          <span>Вылетают при полной группе</span>
          <input
            readOnly
            value={Math.max(0, teamCapacity - advancing)}
          />
        </label>
        <label className="group-explanation-field">
          <span>Пояснение под группой</span>
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            placeholder="Например: итоговое распределение установлено после переигровки согласно правилам"
          />
        </label>
      </div>
      <div className="group-settings-actions">
        {explanation && (
          <button
            className="text-action"
            type="button"
            onClick={() => setExplanation("")}
          >
            Удалить пояснение
          </button>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить группу"}
        </button>
      </div>
    </form>
  );
}

function TournamentDetailsEditor({
  tournament,
  onSaved,
  onMessage,
}: {
  tournament: Tournament;
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState(tournament);
  const [saving, setSaving] = useState(false);

  function setField(field: keyof Tournament, value: string | number) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const response = await fetch("/api/tournament", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        onMessage(
          result.error ?? "Не удалось сохранить данные турнира",
        );
        return;
      }

      onMessage("Изменения турнира сохранены в базе");
      await onSaved();
    } catch {
      onMessage(
        "Не удалось связаться с сервером. Попробуйте сохранить ещё раз.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="tournament-editor" onSubmit={save}>
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Редактор турнира</p>
          <h3>Основная информация</h3>
        </div>
        <button
          className="primary-button compact"
          type="submit"
          disabled={saving}
        >
          {saving ? "Сохраняем…" : "Сохранить изменения"}
        </button>
      </div>

      <div className="editor-grid">
        {editableTournamentFields.map((field) => (
          <label
            className={
              ["description", "about"].includes(field) ? "wide-field" : ""
            }
            key={field}
          >
            <span>{editableTournamentFieldLabels[field]}</span>
            {["description", "about"].includes(field) ? (
              <textarea
                value={String(draft[field])}
                onChange={(event) => setField(field, event.target.value)}
              />
            ) : (
              <input
                value={String(draft[field])}
                onChange={(event) => setField(field, event.target.value)}
              />
            )}
          </label>
        ))}

        <label>
          <span>Начало турнира</span>
          <input
            type="datetime-local"
            value={toDateTimeInput(draft.start_at)}
            onChange={(event) =>
              setField("start_at", fromDateTimeInput(event.target.value))
            }
          />
        </label>
        <label>
          <span>Окончание турнира</span>
          <input
            type="datetime-local"
            value={toDateTimeInput(draft.end_at)}
            onChange={(event) =>
              setField("end_at", fromDateTimeInput(event.target.value))
            }
          />
        </label>
        <label>
          <span>Дедлайн регистрации</span>
          <input
            type="datetime-local"
            value={toDateTimeInput(draft.registration_deadline)}
            onChange={(event) =>
              setField(
                "registration_deadline",
                fromDateTimeInput(event.target.value),
              )
            }
          />
        </label>
        <label>
          <span>Количество игроков</span>
          <input
            type="number"
            min="1"
            max="10"
            value={draft.team_size}
            onChange={(event) =>
              setField("team_size", Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>Количество команд</span>
          <input
            type="number"
            min="2"
            max="64"
            value={draft.max_teams}
            onChange={(event) =>
              setField("max_teams", Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>Check-in, минут</span>
          <input
            type="number"
            min="5"
            max="180"
            value={draft.check_in_minutes}
            onChange={(event) =>
              setField("check_in_minutes", Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>Формат плей-офф</span>
          <select
            value={draft.playoff_type}
            onChange={(event) =>
              setField("playoff_type", event.target.value)
            }
          >
            <option value="single_elimination">Single Elimination</option>
            <option value="double_elimination">Double Elimination</option>
          </select>
        </label>
        <label>
          <span>Рабочий статус</span>
          <select
            value={draft.status}
            onChange={(event) => setField("status", event.target.value)}
          >
            <option value="draft">Черновик</option>
            <option value="registration">Регистрация открыта</option>
            <option value="active">Турнир идёт</option>
            <option value="finished">Завершён</option>
            <option value="archived">В архиве</option>
          </select>
        </label>
      </div>
    </form>
  );
}

export default function Home() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const tournamentSlug = params.slug;
  const manageRequested = searchParams.get("manage") === "1";
  const [data, setData] = useState<SiteData | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [registration, setRegistration] = useState<RegistrationForm>(emptyRegistration);
  const [teamEmblem, setTeamEmblem] = useState<File | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [registrationAvailable, setRegistrationAvailable] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [matchDraft, setMatchDraft] = useState<MatchDraft>(emptyMatchDraft);
  const [groupCount, setGroupCount] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [captainChoices, setCaptainChoices] = useState<Record<number, string>>(
    {},
  );

  const loadData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/tournament?slug=${encodeURIComponent(tournamentSlug)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const errorResult = (await response.json()) as {
          error?: string;
          setupRequired?: boolean;
        };
        throw new Error(errorResult.error ?? "Не удалось загрузить турнир");
      }
      const nextData = (await response.json()) as SiteData;
      setData(nextData);
      setAdminMode(Boolean(nextData.user?.isAdmin));
      setGroupCount(nextData.groups.length || 2);
      setTeamsPerGroup(nextData.groups[0]?.team_capacity ?? 4);
      if (nextData.user?.isAdmin && manageRequested) {
        setActiveTab("admin");
      }
      if (nextData.user) {
        setRegistration((current) => ({
          ...current,
          captain: nextData.user?.playerName ?? "",
          contact: current.contact || `@${nextData.user?.username ?? ""}`,
        }));
        const playersResponse = await fetch("/api/players", { cache: "no-store" });
        if (playersResponse.ok) {
          const playersResult = (await playersResponse.json()) as {
            players: Array<{ ingame_name: string }>;
          };
          setPlayerNames(playersResult.players.map((player) => player.ingame_name));
        }
      }
      setDaysLeft(
        Math.max(
          0,
          Math.ceil(
            (new Date(nextData.tournament.start_at).getTime() - Date.now()) /
              86_400_000,
          ),
        ),
      );
      setRegistrationAvailable(
        new Date(nextData.tournament.registration_deadline).getTime() >
          Date.now(),
      );
      setLoadingError("");
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : "Ошибка загрузки");
    }
  }, [manageRequested, tournamentSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
      const savedTheme = window.localStorage.getItem("ls-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const approvedTeams = useMemo(
    () => data?.applications.filter((team) => team.status === "approved") ?? [],
    [data],
  );

  const pendingTeams = useMemo(
    () =>
      data?.applications.filter((team) =>
        ["pending", "awaiting_members"].includes(team.status),
      ) ?? [],
    [data],
  );

  const standingGroups = useMemo(() => {
    return (data?.groups ?? []).map((group) => ({
      group,
      rows: (data?.standings ?? []).filter(
        (row) => row.group_id === group.id,
      ),
    }));
  }, [data]);

  const captainApplicationIds = useMemo(
    () =>
      new Set(
        (data?.applications ?? [])
          .filter((application) =>
            application.members.some(
              (member) =>
                member.discord_id === data?.user?.discordId &&
                member.is_captain,
            ),
          )
          .map((application) => application.id),
      ),
    [data],
  );

  const teamNameError = getTeamNameError(registration.team_name);
  const selectedRegistrationRoles = [
    registration.captain_role,
    registration.player_2_role,
    registration.player_3_role,
    registration.player_4_role,
    registration.player_5_role,
  ];
  const registrationReady =
    !teamNameError &&
    Boolean(teamEmblem) &&
    registration.rulesAccepted &&
    new Set(selectedRegistrationRoles).size === roleOptions.length &&
    [
      registration.team_name,
      registration.tag,
      registration.captain,
      registration.contact,
      registration.player_2,
      registration.player_3,
      registration.player_4,
      registration.player_5,
    ].every((value) => value.trim().length > 0);

  function startDiscordLogin(returnTo?: string) {
    const destination =
      returnTo ?? `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/api/auth/discord?returnTo=${encodeURIComponent(destination)}`,
    );
  }

  function openRegistration() {
    if (!data?.user) {
      setLoginOpen(true);
      return;
    }
    setRegistrationOpen(true);
  }

  function openMatches() {
    setActiveTab("matches");
    window.requestAnimationFrame(() =>
      document.getElementById("tournament")?.scrollIntoView(),
    );
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !registrationReady || !teamEmblem) return;
    setSaving(true);

    const formData = new FormData();
    formData.set("tournament_id", String(data.tournament.id));
    for (const [field, value] of Object.entries(registration)) {
      if (field !== "rulesAccepted") formData.set(field, String(value));
    }
    formData.set("emblem", teamEmblem);

    const response = await fetch("/api/applications", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setToast(result.error ?? "Не удалось отправить заявку");
      return;
    }

    setRegistration(emptyRegistration);
    setTeamEmblem(null);
    setRegistrationOpen(false);
    setActiveTab("teams");
    setToast("Заявка сохранена в базе и отправлена организатору");
    await loadData();
  }

  async function updateApplicationStatus(id: number, status: TeamApplication["status"]) {
    const response = await fetch("/api/applications", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ id, status }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setToast(result.error ?? "Не удалось изменить заявку");
      return;
    }
    setToast(status === "approved" ? "Команда допущена к турниру" : "Заявка отклонена");
    await loadData();
  }

  async function answerInvitation(
    applicationId: number,
    invitationStatus: "accepted" | "declined",
  ) {
    const response = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: applicationId, invitationStatus }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setToast(result.error ?? "Не удалось ответить на приглашение");
      return;
    }
    setToast(
      invitationStatus === "accepted"
        ? "Вы приняли приглашение в команду"
        : "Вы отклонили приглашение",
    );
    await loadData();
  }

  async function checkIn(matchId: number) {
    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? "Check-in подтверждён"
        : result.error ?? "Не удалось подтвердить готовность",
    );
    if (response.ok) await loadData();
  }

  async function generateGroups() {
    const response = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tournamentId: tournament.id,
        groupCount,
        teamsPerGroup,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? "Группы сформированы"
        : result.error ?? "Не удалось сформировать группы",
    );
    if (response.ok) await loadData();
  }

  async function createMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tournamentId: tournament.id,
        groupId: matchDraft.groupId ? Number(matchDraft.groupId) : null,
        scheduledAt: new Date(matchDraft.scheduledAt).toISOString(),
        stage: matchDraft.stage,
        teamAId: matchDraft.teamAId ? Number(matchDraft.teamAId) : null,
        teamBId: matchDraft.teamBId ? Number(matchDraft.teamBId) : null,
        teamAPlaceholder: matchDraft.teamAPlaceholder || null,
        teamBPlaceholder: matchDraft.teamBPlaceholder || null,
        bestOf: Number(matchDraft.bestOf),
        bracketSide: matchDraft.bracketSide || null,
        bracketRound: matchDraft.bracketRound
          ? Number(matchDraft.bracketRound)
          : null,
        bracketSlot: matchDraft.bracketSlot
          ? Number(matchDraft.bracketSlot)
          : null,
        sortOrder: data?.matches.length ?? 0,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(response.ok ? "Матч добавлен" : result.error ?? "Ошибка");
    if (response.ok) {
      setMatchDraft(emptyMatchDraft);
      await loadData();
    }
  }

  async function saveMatchResult(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawTeamAScore = String(form.get("teamAScore") ?? "").trim();
    const rawTeamBScore = String(form.get("teamBScore") ?? "").trim();
    const rawBracketRound = String(form.get("bracketRound") ?? "").trim();
    const rawBracketSlot = String(form.get("bracketSlot") ?? "").trim();
    const rawWinnerTarget = String(
      form.get("winnerToMatchId") ?? "",
    ).trim();
    const rawLoserTarget = String(form.get("loserToMatchId") ?? "").trim();
    const rawTeamAId = String(form.get("teamAId") ?? "").trim();
    const rawTeamBId = String(form.get("teamBId") ?? "").trim();
    const teamAEliminated = form.get("teamAEliminated") === "on";
    const teamBEliminated = form.get("teamBEliminated") === "on";
    if (teamAEliminated && teamBEliminated) {
      setToast("В одном матче можно отметить только одну выбывшую команду");
      return;
    }
    const eliminatedTeamId = teamAEliminated
      ? Number(rawTeamAId) || null
      : teamBEliminated
        ? Number(rawTeamBId) || null
        : null;
    const response = await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: match.id,
        tournamentId: tournament.id,
        status: String(form.get("status")),
        groupId: String(form.get("groupId") ?? "").trim()
          ? Number(form.get("groupId"))
          : null,
        scheduledAt: new Date(
          String(form.get("scheduledAt")),
        ).toISOString(),
        stage: String(form.get("stage") ?? "").trim(),
        teamAId: rawTeamAId ? Number(rawTeamAId) : null,
        teamBId: rawTeamBId ? Number(rawTeamBId) : null,
        teamAPlaceholder:
          String(form.get("teamAPlaceholder") ?? "").trim() || null,
        teamBPlaceholder:
          String(form.get("teamBPlaceholder") ?? "").trim() || null,
        bestOf: Number(form.get("bestOf")),
        sortOrder: match.sort_order,
        teamAScore: rawTeamAScore ? Number(rawTeamAScore) : null,
        teamBScore: rawTeamBScore ? Number(rawTeamBScore) : null,
        resultType: String(form.get("resultType")),
        teamAResultLabel: String(form.get("teamAResultLabel") ?? "").trim() || null,
        teamBResultLabel: String(form.get("teamBResultLabel") ?? "").trim() || null,
        decisionNote: String(form.get("decisionNote") ?? "").trim() || null,
        bracketRound: rawBracketRound ? Number(rawBracketRound) : null,
        bracketSide: String(form.get("bracketSide") ?? "").trim() || null,
        bracketSlot: rawBracketSlot ? Number(rawBracketSlot) : null,
        winnerToMatchId: rawWinnerTarget ? Number(rawWinnerTarget) : null,
        winnerToSlot:
          String(form.get("winnerToSlot") ?? "").trim() || null,
        loserToMatchId: rawLoserTarget ? Number(rawLoserTarget) : null,
        loserToSlot: String(form.get("loserToSlot") ?? "").trim() || null,
        eliminatedTeamId,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok ? "Результат матча сохранён" : result.error ?? "Ошибка",
    );
    if (response.ok) await loadData();
  }

  async function deleteMatch(match: Match) {
    if (!window.confirm(`Удалить матч ${match.team_a} — ${match.team_b}?`)) {
      return;
    }
    const response = await fetch(`/api/admin/matches?id=${match.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? "Матч удалён"
        : result.error ?? "Не удалось удалить матч",
    );
    if (response.ok) await loadData();
  }

  async function saveTeamResult(
    event: FormEvent<HTMLFormElement>,
    applicationId: number,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawPlacement = String(form.get("placement") ?? "").trim();
    const response = await fetch("/api/admin/tournament-results", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId,
        placement: rawPlacement ? Number(rawPlacement) : null,
        resultLabel: String(form.get("resultLabel") ?? "").trim() || null,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? "Итог команды сохранён"
        : result.error ?? "Не удалось сохранить итог команды",
    );
    if (response.ok) await loadData();
  }

  async function transferCaptain(applicationId: number) {
    const newCaptainId = captainChoices[applicationId];
    if (!newCaptainId) return;
    const response = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: applicationId, newCaptainId }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? "Капитан команды изменён"
        : result.error ?? "Не удалось передать капитанство",
    );
    if (response.ok) await loadData();
  }

  if (loadingError) {
    return (
      <main className="error-screen" data-theme={theme}>
        <Image src="/linkens-sphere-logo.png" alt="" width={74} height={74} priority unoptimized />
        <h1>Сайт временно не загрузился</h1>
        <p>{loadingError}</p>
        <button onClick={() => void loadData()}>Попробовать снова</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-screen" data-theme={theme}>
        <Image src="/linkens-sphere-logo.png" alt="" width={74} height={74} priority unoptimized />
        <span>Загружаем турнир</span>
      </main>
    );
  }

  const tournament = data.tournament;
  const canRegister =
    tournament.status === "registration" && registrationAvailable;
  const isPast = isPastTournament(tournament.status);

  return (
    <main className="site-shell" data-theme={theme}>
      <SiteHeader
        theme={theme}
        setTheme={setTheme}
        user={data.user}
        discordUrl={tournament.discord_url}
      />

      <section className="hero" id="top">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <div className="status-pill"><i />{tournament.status_label}</div>
          <p className="eyebrow">{tournament.eyebrow}</p>
          <h1>
            {tournament.headline}
            <span>{tournament.headline_accent}</span>
          </h1>
          <p className="hero-description">{tournament.description}</p>
          <div className="hero-buttons">
            {canRegister ? (
              <button className="primary-button" onClick={openRegistration}>
                Зарегистрировать команду <FiArrowRight />
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={openMatches}
              >
                {isPast ? "Смотреть результаты" : "Смотреть матчи"}{" "}
                <FiArrowRight />
              </button>
            )}
            <a className="secondary-button" href="#tournament">Подробнее о турнире</a>
          </div>
          <p className="hero-footnote">
            {canRegister
              ? `Состав из ${tournament.team_size} игроков · участие бесплатное · регистрация до ${formatDayMonth(tournament.registration_deadline)}`
              : isPast
                ? "Турнир завершён · результаты и история матчей сохранены"
                : `Состав из ${tournament.team_size} игроков · ${tournament.status_label}`}
          </p>
        </div>

        <div className="hero-poster" aria-label={`Афиша ${tournament.name}`}>
          <div className="poster-heading">
            <span>{tournament.name}</span>
          </div>
          <div className="poster-logo-wrap">
            <div className="poster-ring" />
            <Image src="/linkens-sphere-logo.png" alt="" width={155} height={155} priority unoptimized />
          </div>
          <div className="poster-dates">
            <strong>{formatDayMonth(tournament.start_at)} — {formatDayMonth(tournament.end_at)}</strong>
            <span>{new Date(tournament.start_at).getFullYear()}</span>
          </div>
          <div className="poster-meta">
            <div><small>Формат</small><strong>{tournament.format}</strong></div>
            <div><small>Слотов</small><strong>{tournament.max_teams} команд</strong></div>
          </div>
        </div>
      </section>

      <section className="quick-facts" aria-label="Этапы турнира">
        <div><span>1</span><strong>{tournament.group_format}</strong></div>
        <div><span>2</span><strong>{tournament.playoff_format}</strong></div>
        <div><span>3</span><strong>{tournament.final_format}</strong></div>
      </section>

      <section className="tournament-section" id="tournament">
        {data.invitations.length > 0 && (
          <div className="invitation-banner">
            {data.invitations.map((invitation) => (
              <div key={invitation.application_id}>
                <span>
                  Вас приглашают в <strong>{invitation.team_name}</strong> на роль{" "}
                  {roleOptions.find((role) => role.value === invitation.role)?.label}
                </span>
                <div>
                  <button
                    onClick={() =>
                      void answerInvitation(invitation.application_id, "accepted")
                    }
                  >
                    Принять
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      void answerInvitation(invitation.application_id, "declined")
                    }
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="section-heading">
          <div className="tournament-heading-copy">
            {!isPast && (
              <p className="section-kicker">Турнир сообщества</p>
            )}
            <h2>{tournament.name}</h2>
            <p className="tournament-heading-dates">
              {formatShortDate(tournament.start_at)} —{" "}
              {formatShortDate(tournament.end_at)}
            </p>
          </div>
          <div className={isPast ? "tournament-status archived" : "countdown"}>
            {isPast ? (
              tournament.status === "archived" ? "Архив" : "Завершён"
            ) : (
              <>
                <span>До начала</span>
                <strong>{daysLeft}</strong>
                <span>дней</span>
              </>
            )}
          </div>
        </div>

        <div
          className="tabs tournament-tabs"
          role="tablist"
          aria-label="Разделы турнира"
        >
          <div className="tournament-tabs-main">
            {[
              ["overview", "Обзор"],
              [
                "teams",
                `Команды ${approvedTeams.length}/${tournament.max_teams}`,
              ],
              ["matches", "Матчи"],
              ["rules", "Дополнительные правила"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={activeTab === id ? "active" : ""}
                onClick={() => setActiveTab(id)}
                role="tab"
                aria-selected={activeTab === id}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tournament-tabs-stages">
            {[
              ["groups", "Групповой этап"],
              ["playoffs", "Плей-офф"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={activeTab === id ? "active" : ""}
                onClick={() => setActiveTab(id)}
                role="tab"
                aria-selected={activeTab === id}
              >
                {label}
              </button>
            ))}
            {adminMode && (
              <button
                className={`admin-tab${activeTab === "admin" ? " active" : ""}`}
                onClick={() => setActiveTab("admin")}
                role="tab"
                aria-selected={activeTab === "admin"}
              >
                Управление
                {pendingTeams.length ? ` · ${pendingTeams.length}` : ""}
              </button>
            )}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="overview-grid tab-panel">
            <article className="content-card about-card">
              <p className="card-kicker">О турнире</p>
              <h3>{tournament.headline}</h3>
              {tournament.headline_accent && (
                <p className="about-tournament-dates">
                  {tournament.headline_accent}
                </p>
              )}
              <p>{tournament.about}</p>
              <div className="stage-flow">
                <div>
                  <span>1</span>
                  <strong>Регистрация</strong>
                  <small>до {formatDayMonth(tournament.registration_deadline)}</small>
                </div>
                <i />
                <div>
                  <span>2</span>
                  <strong>Группы</strong>
                  <small>{tournament.group_format}</small>
                </div>
                <i />
                <div>
                  <span>3</span>
                  <strong>Плей-офф</strong>
                  <small>{tournament.playoff_format}</small>
                </div>
              </div>
            </article>
            <aside className="details-card tournament-schedule-card">
              <div className="tournament-schedule-heading">
                <span>По московскому времени</span>
                <strong>Расписание турнира</strong>
              </div>
              {data.scheduleDays.map((day, dayIndex) => (
                <section className="tournament-schedule-day" key={day.id}>
                  <header>
                    <strong>{day.title || `День ${dayIndex + 1}`}</strong>
                    <span>{formatScheduleDate(day.day_date)}</span>
                  </header>
                  <div className="tournament-schedule-entries">
                    {day.entries.map((entry) => (
                      <div key={entry.id}>
                        <time>{entry.start_time}</time>
                        <span>
                          <strong>{entry.stage_name}</strong>
                          <small>
                            {formatMatchCount(entry.match_count)} ·{" "}
                            {entry.series_format}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {!data.scheduleDays.length && (
                <p className="tournament-schedule-empty">
                  Расписание будет опубликовано организатором.
                </p>
              )}
            </aside>
            {data.prizes.length > 0 && (
              <article className="content-card tournament-prizes">
                <div className="prize-heading">
                  <p className="card-kicker">Призовые места</p>
                  <h3>Итоги и награды</h3>
                </div>
                <div className="prize-list">
                  {data.prizes.map((prize) => (
                    <div key={prize.id}>
                      <strong>{prize.placement}</strong>
                      <span>
                        <b>{prize.team_name}</b>
                        {prize.prize_text && <small>{prize.prize_text}</small>}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="tab-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Участники</p>
                <h3>Подтверждённые команды</h3>
              </div>
              {canRegister && (
                <button className="primary-button compact" onClick={openRegistration}>
                  Подать заявку <FiArrowRight />
                </button>
              )}
            </div>
            <div className="teams-grid">
              {data.applications.filter((team) => team.status !== "declined").map((team) => (
                <article className="team-card" key={team.id}>
                  <div className="team-card-head">
                    {team.logo_key ? (
                      <Image
                        className="team-emblem"
                        src={`/api/team-emblems/${team.logo_key}`}
                        alt={`Эмблема команды ${team.team_name}`}
                        width={60}
                        height={60}
                        unoptimized
                      />
                    ) : (
                      <div className="team-avatar">{initials(team.team_name)}</div>
                    )}
                    <span className={`status-badge ${team.status}`}>
                      {team.status === "approved"
                        ? "Допущена"
                        : team.status === "awaiting_members"
                          ? "Ждёт игроков"
                          : "На проверке"}
                    </span>
                  </div>
                  <p className="team-tag">{team.tag}</p>
                  <h3>{team.team_name}</h3>
                  <div className="team-archive-meta">
                    <span>{team.selection_method}</span>
                    {team.team_tier_total_snapshot !== null && (
                      <span>Тир команды: {team.team_tier_total_snapshot}</span>
                    )}
                  </div>
                  {(team.result_label || team.placement) && (
                    <div className="team-result-badge">
                      {team.result_label || `${team.placement}-е место`}
                    </div>
                  )}
                  <ul>
                    {getTeamPlayers(team).map((player) => (
                      <li key={`${team.id}-${player.name}`}>
                        <RoleIcon role={player.role} />
                        {player.dotaId ? (
                          <Link
                            className="player-name player-profile-link"
                            href={`/players/${player.dotaId}`}
                          >
                            {player.name}
                          </Link>
                        ) : (
                          <span className="player-name">{player.name}</span>
                        )}
                        {player.isCaptain && (
                          <small className="captain-badge"><FaCrown aria-hidden="true" /> капитан</small>
                        )}
                        {player.tier !== null && (
                          <small className="player-tier">тир {player.tier}</small>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              {canRegister && approvedTeams.length < tournament.max_teams && (
                <button className="empty-team" onClick={openRegistration}>
                  <span>+</span>
                  <strong>Свободный слот</strong>
                  <small>Зарегистрировать команду</small>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="tab-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Расписание</p>
                <h3>{isPast ? "Результаты матчей" : "Ближайшие матчи"}</h3>
              </div>
              <span className="timezone">Московское время · UTC+3</span>
            </div>
            <div className="matches-list">
              {data.matches.map((match) => (
                <article className="match-row" key={match.id}>
                  <div className="match-date">
                    <strong>{formatTime(match.scheduled_at)}</strong>
                    <span>{formatDayMonth(match.scheduled_at)}</span>
                  </div>
                  <div className="match-stage">
                    {match.stage}
                    {match.bracket_side && (
                      <small>
                        {{
                          group: "Группы",
                          upper: "Верхняя сетка",
                          lower: "Нижняя сетка",
                          grand_final: "Гранд-финал",
                        }[match.bracket_side]}
                        {match.bracket_round ? ` · раунд ${match.bracket_round}` : ""}
                      </small>
                    )}
                  </div>
                  <div className="match-team first"><i>{initials(match.team_a)}</i><strong>{match.team_a}</strong></div>
                  <div className="match-score">
                    {match.team_a_result_label ??
                      (match.team_a_score === null ? "—" : match.team_a_score)}
                    <span>:</span>
                    {match.team_b_result_label ??
                      (match.team_b_score === null ? "—" : match.team_b_score)}
                  </div>
                  <div className="match-team second"><strong>{match.team_b}</strong><i>{initials(match.team_b)}</i></div>
                  <span className="best-of">BO{match.best_of}</span>
                  {!isPast && (
                    <span className="checkin-state">
                      {match.team_a_checked_in || match.team_b_checked_in
                        ? `Готовы: ${[
                            match.team_a_checked_in ? match.team_a : "",
                            match.team_b_checked_in ? match.team_b : "",
                          ]
                            .filter(Boolean)
                            .join(", ")}`
                        : "Готовность ожидается"}
                    </span>
                  )}
                  {data.user &&
                    !isPast &&
                    match.status === "scheduled" &&
                    ((match.team_a_application_id !== null &&
                      captainApplicationIds.has(
                        match.team_a_application_id,
                      )) ||
                      (match.team_b_application_id !== null &&
                        captainApplicationIds.has(
                          match.team_b_application_id,
                        ))) && (
                    <button
                      className="match-checkin"
                      onClick={() => void checkIn(match.id)}
                    >
                      Check-in
                    </button>
                  )}
                  {match.decision_note && (
                    <p className="match-decision-note">{match.decision_note}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="tab-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Групповой этап</p>
                <h3>Турнирное положение</h3>
              </div>
              <span className="timezone">
                Место определяется по выигранным картам
              </span>
            </div>
            <div className="standings-groups">
              {standingGroups.map(({ group, rows }) => {
                return (
                  <section className="standing-group" key={group.id}>
                    <h4>{group.name}</h4>
                    <div className="standings">
                      <div className="standing-row standing-head">
                        <span>#</span>
                        <span>Команда</span>
                        <span>Матчи</span>
                        <span>Карты</span>
                        <span>Итог</span>
                      </div>
                      {rows.map((row) => {
                        const outcome = groupOutcome(
                          row.place,
                          group,
                          tournament.playoff_type,
                        );
                        const eliminated = outcome === "eliminated";
                        const destination = groupOutcomeLabel(outcome);
                        return (
                          <div
                            className={`standing-row${
                              eliminated ? " eliminated" : " advanced"
                            }`}
                            key={row.id}
                          >
                            <span className="place">{row.place}</span>
                            <span className="standing-team">
                              <i>{initials(row.team_name)}</i>
                              <strong>{row.team_name}</strong>
                            </span>
                            <span>{row.games}</span>
                            <strong>{row.maps_won}</strong>
                            <span
                              className={`standing-outcome${
                                eliminated ? " eliminated" : ""
                              }`}
                            >
                              {destination}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {group.explanation && (
                      <p className="group-explanation">
                        {group.explanation}
                      </p>
                    )}
                    {adminMode && (
                      <GroupSettingsEditor
                        key={`${group.id}:${group.team_capacity}:${group.advance_to_playoff}:${group.advance_to_upper}:${group.advance_to_lower}:${group.explanation}`}
                        group={group}
                        playoffType={tournament.playoff_type}
                        onSaved={loadData}
                        onMessage={setToast}
                      />
                    )}
                  </section>
                );
              })}
              {!standingGroups.length && (
                <div className="empty-standings">Группы ещё не сформированы</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "playoffs" && (
          <div className="tab-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Плей-офф</p>
                <h3>Турнирная сетка</h3>
              </div>
              <span className="timezone">
                Наведите на команду, чтобы увидеть её путь
              </span>
            </div>
            <TournamentBracket
              key={data.matches
                .filter(
                  (match) =>
                    match.bracket_side !== null &&
                    match.bracket_side !== "group",
                )
                .map(
                  (match) =>
                    `${match.id}:${match.bracket_round}:${match.bracket_slot}:${match.bracket_grid_column}:${match.bracket_grid_row}:${match.eliminated_team_application_id}`,
                )
                .join("|")}
              matches={data.matches.filter(
                (match) =>
                  match.bracket_side !== null &&
                  match.bracket_side !== "group",
              )}
              editable={adminMode}
              tournamentId={tournament.id}
            />
          </div>
        )}

        {activeTab === "rules" && (
          <div className="tab-panel rules-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Документы турнира</p>
                <h3>Дополнительные правила</h3>
              </div>
              <span className="timezone">{data.rules.length} пунктов</span>
            </div>
            <ol className="tournament-rules-list">
              {data.rules.map((rule) => (
                <li key={rule.id}>{rule.rule_text}</li>
              ))}
            </ol>
            {!data.rules.length && (
              <div className="empty-standings">
                Дополнительные правила для этого турнира не указаны
              </div>
            )}
          </div>
        )}

        {activeTab === "admin" && adminMode && (
          <div className="tab-panel admin-panel">
            <div className="admin-summary">
              <div><span>Заявок</span><strong>{data.applications.length}</strong></div>
              <div><span>Ждут решения</span><strong>{pendingTeams.length}</strong></div>
              <div><span>Допущено</span><strong>{approvedTeams.length}</strong></div>
            </div>

            <div className="admin-toolbar">
              <div>
                <strong>Групповой этап</strong>
                <span>
                  Распределит допущенные команды змейкой между указанным
                  количеством групп и сохранит правила выхода в плей-офф.
                </span>
              </div>
              <label>
                <span>Групп</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={groupCount}
                  onChange={(event) => setGroupCount(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Команд в группе</span>
                <input
                  type="number"
                  min="3"
                  max="8"
                  value={teamsPerGroup}
                  onChange={(event) =>
                    setTeamsPerGroup(Number(event.target.value))
                  }
                />
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void generateGroups()}
                disabled={approvedTeams.length < 2}
              >
                Сформировать группы
              </button>
            </div>

            <TournamentDetailsEditor
              key={`${tournament.id}-${tournament.updated_at}`}
              tournament={tournament}
              onSaved={loadData}
              onMessage={setToast}
            />

            <TournamentContentEditor
              key={`${tournament.id}-${tournament.updated_at}`}
              tournamentId={tournament.id}
              initialScheduleDays={data.scheduleDays}
              initialRules={data.rules}
              initialPrizes={data.prizes}
              applications={data.applications}
              onSaved={loadData}
            />

            <section className="applications-panel">
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">Регистрация</p>
                  <h3>Заявки команд</h3>
                </div>
              </div>
              <div className="application-list">
                {data.applications.map((application) => (
                  <article className="application-row" key={application.id}>
                    {application.logo_key ? (
                      <Image
                        className="team-emblem small"
                        src={`/api/team-emblems/${application.logo_key}`}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                      />
                    ) : (
                      <div className="team-avatar small">{initials(application.team_name)}</div>
                    )}
                    <div className="application-copy">
                      <span className={`status-badge ${application.status}`}>
                        {application.status === "approved"
                          ? "Допущена"
                          : application.status === "declined"
                            ? "Отклонена"
                            : application.status === "awaiting_members"
                              ? "Ждёт подтверждений игроков"
                              : "Новая заявка"}
                      </span>
                      <h4>{application.team_name} <small>[{application.tag}]</small></h4>
                      <p>Капитан: {application.captain} · {application.contact}</p>
                      <ul className="application-roster-links">
                        {getTeamPlayers(application).map((player) => {
                          const role = roleOptions.find(
                            (option) => option.value === player.role,
                          );
                          return (
                            <li key={`${application.id}-${player.name}`}>
                              <span>{role?.position ?? "—"}.</span>
                              {player.dotaId ? (
                                <Link href={`/players/${player.dotaId}`}>
                                  {player.name}
                                </Link>
                              ) : (
                                <b>{player.name}</b>
                              )}
                              {player.isCaptain && <small>капитан</small>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="application-actions">
                      <button disabled={application.status === "approved"} onClick={() => void updateApplicationStatus(application.id, "approved")}>Допустить</button>
                      <button className="danger" disabled={application.status === "declined"} onClick={() => void updateApplicationStatus(application.id, "declined")}>Отклонить</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="applications-panel archive-rosters-admin">
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">Архивные данные</p>
                  <h3>Составы и исторические тиры</h3>
                  <p>
                    Никнейм и тир сохраняются в том виде, в котором игрок
                    участвовал в этом турнире. Для старого ника можно указать
                    Dota ID актуального профиля — тогда ник станет ссылкой, но
                    его историческое написание не изменится. Пустой Dota ID
                    оставляет ник обычным текстом.
                  </p>
                </div>
              </div>
              <details>
                <summary>Добавить архивную команду</summary>
                <ArchiveRosterEditor
                  tournamentId={tournament.id}
                  onSaved={loadData}
                  onMessage={setToast}
                />
              </details>
              {data.applications.map((application) => (
                <details key={application.id}>
                  <summary>
                    {application.team_name} · {application.selection_method}
                  </summary>
                  <ArchiveRosterEditor
                    tournamentId={tournament.id}
                    team={application}
                    onSaved={loadData}
                    onMessage={setToast}
                  />
                </details>
              ))}
            </section>

            <section className="applications-panel team-results-admin">
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">История турнира</p>
                  <h3>Итоги команд</h3>
                  <p>
                    Укажите место и, при необходимости, понятную подпись —
                    например «Чемпион», «Финалист» или «5–6-е место». Итог
                    автоматически появится в профилях всех игроков команды.
                  </p>
                </div>
              </div>
              <div className="team-result-editor-list">
                {approvedTeams.map((application) => (
                  <form
                    className="team-result-editor-row"
                    key={application.id}
                    onSubmit={(event) =>
                      void saveTeamResult(event, application.id)
                    }
                  >
                    <strong>{application.team_name}</strong>
                    <label>
                      <span>Место</span>
                      <input
                        name="placement"
                        type="number"
                        min="1"
                        max="64"
                        defaultValue={application.placement ?? ""}
                        placeholder="1"
                      />
                    </label>
                    <label>
                      <span>Подпись результата</span>
                      <input
                        name="resultLabel"
                        maxLength={120}
                        defaultValue={application.result_label ?? ""}
                        placeholder="Например: Чемпион"
                      />
                    </label>
                    <button type="submit">Сохранить</button>
                  </form>
                ))}
                {!approvedTeams.length && (
                  <p className="empty-admin-list">
                    Сначала допустите команды к турниру.
                  </p>
                )}
              </div>
            </section>

            <section className="applications-panel match-admin">
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">Расписание</p>
                  <h3>Матчи и результаты</h3>
                </div>
              </div>
              <details className="match-create-panel">
                <summary>Добавить новый матч</summary>
                <form className="match-editor" onSubmit={createMatch}>
                  <fieldset className="match-editor-section">
                    <legend>Основные данные</legend>
                    <div className="match-form-grid">
                      <label>
                        <span>Название этапа</span>
                        <input
                          required
                          value={matchDraft.stage}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              stage: event.target.value,
                            })
                          }
                          placeholder="Например: Нижняя сетка"
                        />
                      </label>
                      <label>
                        <span>Дата и время</span>
                        <input
                          required
                          type="datetime-local"
                          value={matchDraft.scheduledAt}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              scheduledAt: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Группа</span>
                        <select
                          value={matchDraft.groupId}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              groupId: event.target.value,
                            })
                          }
                        >
                          <option value="">Без группы</option>
                          {data.groups.map((group) => (
                            <option value={group.id} key={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Формат серии</span>
                        <select
                          value={matchDraft.bestOf}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              bestOf: event.target.value,
                            })
                          }
                        >
                          {[1, 2, 3, 5].map((bestOf) => (
                            <option value={bestOf} key={bestOf}>
                              BO{bestOf}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="match-editor-section">
                    <legend>Команды</legend>
                    <div className="match-team-editor-grid">
                      <div className="match-team-admin-card team-a">
                        <strong>Команда A</strong>
                        <label>
                          <span>Зарегистрированная команда</span>
                          <select
                            value={matchDraft.teamAId}
                            onChange={(event) =>
                              setMatchDraft({
                                ...matchDraft,
                                teamAId: event.target.value,
                              })
                            }
                          >
                            <option value="">Выбрать позже</option>
                            {approvedTeams.map((team) => (
                              <option value={team.id} key={team.id}>
                                {team.team_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!matchDraft.teamAId && (
                          <label>
                            <span>Подпись до определения команды</span>
                            <input
                              required
                              value={matchDraft.teamAPlaceholder}
                              onChange={(event) =>
                                setMatchDraft({
                                  ...matchDraft,
                                  teamAPlaceholder: event.target.value,
                                })
                              }
                              placeholder="Например: 1-е место группы A"
                            />
                          </label>
                        )}
                      </div>
                      <div className="match-team-admin-card team-b">
                        <strong>Команда B</strong>
                        <label>
                          <span>Зарегистрированная команда</span>
                          <select
                            value={matchDraft.teamBId}
                            onChange={(event) =>
                              setMatchDraft({
                                ...matchDraft,
                                teamBId: event.target.value,
                              })
                            }
                          >
                            <option value="">Выбрать позже</option>
                            {approvedTeams.map((team) => (
                              <option value={team.id} key={team.id}>
                                {team.team_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!matchDraft.teamBId && (
                          <label>
                            <span>Подпись до определения команды</span>
                            <input
                              required
                              value={matchDraft.teamBPlaceholder}
                              onChange={(event) =>
                                setMatchDraft({
                                  ...matchDraft,
                                  teamBPlaceholder: event.target.value,
                                })
                              }
                              placeholder="Например: 2-е место группы B"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="match-editor-section">
                    <legend>Положение в сетке</legend>
                    <div className="match-form-grid three-columns">
                      <label>
                        <span>Секция</span>
                        <select
                          value={matchDraft.bracketSide}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              bracketSide: event.target.value,
                            })
                          }
                        >
                          <option value="">Без секции</option>
                          <option value="group">Групповой этап</option>
                          <option value="upper">Верхняя сетка</option>
                          <option value="lower">Нижняя сетка</option>
                          <option value="grand_final">Гранд-финал</option>
                        </select>
                      </label>
                      <label>
                        <span>Раунд</span>
                        <input
                          type="number"
                          min="1"
                          value={matchDraft.bracketRound}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              bracketRound: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Порядок в раунде</span>
                        <input
                          type="number"
                          min="1"
                          value={matchDraft.bracketSlot}
                          onChange={(event) =>
                            setMatchDraft({
                              ...matchDraft,
                              bracketSlot: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </fieldset>
                  <div className="match-editor-actions">
                    <button className="primary-button compact" type="submit">
                      Добавить матч
                    </button>
                  </div>
                </form>
              </details>

              <div className="match-result-list">
                {data.matches.map((match) => (
                  <article className="match-result-card" key={match.id}>
                    <details>
                      <summary>
                        <span>
                          <strong>
                            {match.team_a} — {match.team_b}
                          </strong>
                          <small>
                            {match.stage} · {formatDayMonth(match.scheduled_at)}{" "}
                            {formatTime(match.scheduled_at)} · BO{match.best_of}
                          </small>
                        </span>
                        <b>Редактировать</b>
                      </summary>
                      <form
                        className="match-result-form"
                        onSubmit={(event) => void saveMatchResult(event, match)}
                      >
                        <fieldset className="match-editor-section">
                          <legend>Основные данные матча</legend>
                          <div className="match-form-grid">
                            <label>
                              <span>Название этапа</span>
                              <input
                                name="stage"
                                required
                                defaultValue={match.stage}
                                placeholder="Этап"
                              />
                            </label>
                            <label>
                              <span>Дата и время</span>
                              <input
                                name="scheduledAt"
                                required
                                type="datetime-local"
                                defaultValue={toDateTimeInput(
                                  match.scheduled_at,
                                )}
                              />
                            </label>
                            <label>
                              <span>Группа</span>
                              <select
                                name="groupId"
                                defaultValue={match.group_id ?? ""}
                              >
                                <option value="">Без группы</option>
                                {data.groups.map((group) => (
                                  <option value={group.id} key={group.id}>
                                    {group.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>Формат серии</span>
                              <select
                                name="bestOf"
                                defaultValue={match.best_of}
                              >
                                {[1, 2, 3, 5].map((bestOf) => (
                                  <option value={bestOf} key={bestOf}>
                                    BO{bestOf}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>Статус матча</span>
                              <select
                                name="status"
                                defaultValue={match.status}
                              >
                                <option value="scheduled">Запланирован</option>
                                <option value="ready">Команды готовы</option>
                                <option value="live">Идёт</option>
                                <option value="finished">Завершён</option>
                                <option value="cancelled">Отменён</option>
                              </select>
                            </label>
                            <label>
                              <span>Тип результата</span>
                              <select
                                name="resultType"
                                defaultValue={match.result_type}
                              >
                                <option value="normal">
                                  Обычный результат
                                </option>
                                <option value="technical">
                                  Технический результат
                                </option>
                                <option value="forfeit">Отказ от игры</option>
                                <option value="cancelled">Матч отменён</option>
                              </select>
                            </label>
                          </div>
                        </fieldset>

                        <fieldset className="match-editor-section">
                          <legend>Команды, счёт и вылет</legend>
                          <div className="match-team-editor-grid">
                            <div className="match-team-admin-card team-a">
                              <header>
                                <span>Команда A</span>
                                <strong>{match.team_a}</strong>
                              </header>
                              <label>
                                <span>Зарегистрированная команда</span>
                                <select
                                  name="teamAId"
                                  defaultValue={
                                    match.team_a_application_id ?? ""
                                  }
                                >
                                  <option value="">
                                    Использовать подпись ниже
                                  </option>
                                  {approvedTeams.map((team) => (
                                    <option value={team.id} key={team.id}>
                                      {team.team_name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>Подпись-заполнитель</span>
                                <input
                                  name="teamAPlaceholder"
                                  defaultValue={
                                    match.team_a_placeholder ?? ""
                                  }
                                  placeholder="Например: победитель группы A"
                                />
                              </label>
                              <div className="match-team-result-grid">
                                <label>
                                  <span>Счёт</span>
                                  <input
                                    name="teamAScore"
                                    type="number"
                                    min="0"
                                    defaultValue={match.team_a_score ?? ""}
                                  />
                                </label>
                                <label>
                                  <span>Обозначение</span>
                                  <input
                                    name="teamAResultLabel"
                                    maxLength={20}
                                    defaultValue={
                                      match.team_a_result_label ?? ""
                                    }
                                    placeholder="tw / tl"
                                  />
                                </label>
                              </div>
                              {match.bracket_side &&
                                match.bracket_side !== "group" &&
                                match.team_a_application_id && (
                                <label className="elimination-checkbox">
                                  <input
                                    name="teamAEliminated"
                                    type="checkbox"
                                    defaultChecked={
                                      match.eliminated_team_application_id ===
                                      match.team_a_application_id
                                    }
                                    onChange={(event) => {
                                      if (!event.currentTarget.checked) return;
                                      const other =
                                        event.currentTarget.form?.elements.namedItem(
                                          "teamBEliminated",
                                        );
                                      if (other instanceof HTMLInputElement) {
                                        other.checked = false;
                                      }
                                    }}
                                  />
                                  <span>
                                    Вылетела из турнира после этого матча
                                  </span>
                                </label>
                              )}
                            </div>

                            <div className="match-team-admin-card team-b">
                              <header>
                                <span>Команда B</span>
                                <strong>{match.team_b}</strong>
                              </header>
                              <label>
                                <span>Зарегистрированная команда</span>
                                <select
                                  name="teamBId"
                                  defaultValue={
                                    match.team_b_application_id ?? ""
                                  }
                                >
                                  <option value="">
                                    Использовать подпись ниже
                                  </option>
                                  {approvedTeams.map((team) => (
                                    <option value={team.id} key={team.id}>
                                      {team.team_name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>Подпись-заполнитель</span>
                                <input
                                  name="teamBPlaceholder"
                                  defaultValue={
                                    match.team_b_placeholder ?? ""
                                  }
                                  placeholder="Например: победитель группы B"
                                />
                              </label>
                              <div className="match-team-result-grid">
                                <label>
                                  <span>Счёт</span>
                                  <input
                                    name="teamBScore"
                                    type="number"
                                    min="0"
                                    defaultValue={match.team_b_score ?? ""}
                                  />
                                </label>
                                <label>
                                  <span>Обозначение</span>
                                  <input
                                    name="teamBResultLabel"
                                    maxLength={20}
                                    defaultValue={
                                      match.team_b_result_label ?? ""
                                    }
                                    placeholder="tw / tl"
                                  />
                                </label>
                              </div>
                              {match.bracket_side &&
                                match.bracket_side !== "group" &&
                                match.team_b_application_id && (
                                <label className="elimination-checkbox">
                                  <input
                                    name="teamBEliminated"
                                    type="checkbox"
                                    defaultChecked={
                                      match.eliminated_team_application_id ===
                                      match.team_b_application_id
                                    }
                                    onChange={(event) => {
                                      if (!event.currentTarget.checked) return;
                                      const other =
                                        event.currentTarget.form?.elements.namedItem(
                                          "teamAEliminated",
                                        );
                                      if (other instanceof HTMLInputElement) {
                                        other.checked = false;
                                      }
                                    }}
                                  />
                                  <span>
                                    Вылетела из турнира после этого матча
                                  </span>
                                </label>
                              )}
                            </div>
                          </div>
                        </fieldset>

                        <fieldset className="match-editor-section">
                          <legend>Положение в сетке</legend>
                          <div className="match-form-grid three-columns">
                            <label>
                              <span>Секция</span>
                              <select
                                name="bracketSide"
                                defaultValue={match.bracket_side ?? ""}
                              >
                                <option value="">Без секции сетки</option>
                                <option value="group">Групповой этап</option>
                                <option value="upper">Верхняя сетка</option>
                                <option value="lower">Нижняя сетка</option>
                                <option value="grand_final">
                                  Гранд-финал
                                </option>
                              </select>
                            </label>
                            <label>
                              <span>Раунд</span>
                              <input
                                name="bracketRound"
                                type="number"
                                min="1"
                                defaultValue={match.bracket_round ?? ""}
                              />
                            </label>
                            <label>
                              <span>Порядок в раунде</span>
                              <input
                                name="bracketSlot"
                                type="number"
                                min="1"
                                defaultValue={match.bracket_slot ?? ""}
                              />
                            </label>
                          </div>
                        </fieldset>

                        {matchUsesBracketRouting(match) ? (
                          <fieldset className="bracket-link-editor">
                            <legend>Куда проходят команды</legend>
                            <label>
                              <span>Победитель проходит в матч</span>
                              <select
                                name="winnerToMatchId"
                                defaultValue={match.winner_to_match_id ?? ""}
                              >
                                <option value="">Не задано</option>
                                {data.matches
                                  .filter(
                                    (target) =>
                                      target.id !== match.id &&
                                      matchUsesBracketRouting(target),
                                  )
                                  .map((target) => (
                                    <option value={target.id} key={target.id}>
                                      {target.stage}: {target.team_a} —{" "}
                                      {target.team_b}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label>
                              <span>Занимает сторону</span>
                              <select
                                name="winnerToSlot"
                                defaultValue={match.winner_to_slot ?? ""}
                              >
                                <option value="">—</option>
                                <option value="a">Команда A</option>
                                <option value="b">Команда B</option>
                              </select>
                            </label>
                            <label>
                              <span>Проигравший проходит в матч</span>
                              <select
                                name="loserToMatchId"
                                defaultValue={match.loser_to_match_id ?? ""}
                              >
                                <option value="">Не задано</option>
                                {data.matches
                                  .filter(
                                    (target) =>
                                      target.id !== match.id &&
                                      matchUsesBracketRouting(target),
                                  )
                                  .map((target) => (
                                    <option value={target.id} key={target.id}>
                                      {target.stage}: {target.team_a} —{" "}
                                      {target.team_b}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label>
                              <span>Занимает сторону</span>
                              <select
                                name="loserToSlot"
                                defaultValue={match.loser_to_slot ?? ""}
                              >
                                <option value="">—</option>
                                <option value="a">Команда A</option>
                                <option value="b">Команда B</option>
                              </select>
                            </label>
                          </fieldset>
                        ) : (
                          <div className="match-routing-note">
                            <strong>
                              {match.group_id !== null ||
                              match.bracket_side === "group"
                                ? "Выход определяется итогами группы"
                                : "Переходы по сетке не заданы"}
                            </strong>
                            <span>
                              {match.group_id !== null ||
                              match.bracket_side === "group"
                                ? "В отдельном групповом матче победитель и проигравший никуда не переходят. Слоты в плей-офф распределяются по итоговой таблице и настройкам группы."
                                : "Сначала выберите для матча секцию плей-офф и сохраните изменения. После этого можно будет связать его со следующими матчами."}
                            </span>
                          </div>
                        )}

                        <label className="match-decision-editor">
                          <span>Комментарий организатора</span>
                          <textarea
                            name="decisionNote"
                            defaultValue={match.decision_note ?? ""}
                            placeholder="Например: техническое поражение из-за игры с чужого аккаунта"
                          />
                        </label>
                        <div className="match-result-actions">
                          <button type="submit">Сохранить изменения</button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => void deleteMatch(match)}
                          >
                            Удалить матч
                          </button>
                        </div>
                      </form>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      <section className="community-section">
        <div>
          <p className="section-kicker">Linken&apos;s Sphere Esports</p>
          <h2>Своя команда.<br />Своя сцена.</h2>
        </div>
        <div>
          <p>Русскоязычное Dota-сообщество, где играют, собирают команды, проводят лиги и смотрят турниры вместе.</p>
          <a href={tournament.discord_url} target="_blank" rel="noreferrer">
            <FaDiscord />
            <span><small>500+ участников</small>Открыть наш Discord</span>
            <FiArrowUpRight />
          </a>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top">
          <Image src="/linkens-sphere-logo.png" alt="" width={48} height={48} unoptimized />
          <span><strong>Linken&apos;s Sphere</strong><small>Esports community</small></span>
        </a>
        <p>Создано сообществом для сообщества · 2026</p>
        <OrganizerAccess
          user={data.user}
          manageHref={`/tournaments/${tournament.slug}?manage=1`}
        />
      </footer>

      {registrationOpen && (
        <div className="modal-backdrop" onMouseDown={() => setRegistrationOpen(false)}>
          <section className="modal registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="Закрыть" onClick={() => setRegistrationOpen(false)}>×</button>
            <Image className="modal-logo" src="/linkens-sphere-logo.png" alt="" width={58} height={58} unoptimized />
            <p className="card-kicker">{tournament.name}</p>
            <h2 id="registration-title">Регистрация команды</h2>
            <p className="modal-intro">Заполните состав. Заявка сохранится в базе, а организатор увидит её в своей панели.</p>
            <form onSubmit={submitRegistration}>
              <div className="form-grid two">
                <label>
                  <span>Название команды</span>
                  <input
                    required
                    maxLength={20}
                    aria-invalid={Boolean(registration.team_name && teamNameError)}
                    value={registration.team_name}
                    onChange={(event) => setRegistration({ ...registration, team_name: event.target.value })}
                    placeholder="Например, Radiant Five"
                  />
                  <small className={teamNameError && registration.team_name ? "field-error" : "field-hint"}>
                    {registration.team_name && teamNameError ? teamNameError : `${registration.team_name.length}/20 · не более 2 спецсимволов`}
                  </small>
                </label>
                <label><span>Тег</span><input required maxLength={5} value={registration.tag} onChange={(event) => setRegistration({ ...registration, tag: event.target.value })} placeholder="R5" /></label>
              </div>
              <datalist id="registered-players">
                {playerNames.map((name) => (
                  <option value={name} key={name} />
                ))}
              </datalist>
              <label className={`emblem-upload ${teamEmblem ? "has-file" : ""}`}>
                <span className="emblem-upload-icon"><FiUploadCloud aria-hidden="true" /></span>
                <span className="emblem-upload-copy">
                  <strong>Эмблема команды</strong>
                  <small>{teamEmblem ? teamEmblem.name : "Обязательный файл · PNG, JPG или WebP · до 2 МБ"}</small>
                </span>
                <input
                  required
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                      setToast("Эмблема должна быть в формате PNG, JPG или WebP");
                      event.target.value = "";
                      setTeamEmblem(null);
                      return;
                    }
                    if (file && file.size > 2 * 1024 * 1024) {
                      setToast("Размер эмблемы не должен превышать 2 МБ");
                      event.target.value = "";
                      setTeamEmblem(null);
                      return;
                    }
                    setTeamEmblem(file);
                  }}
                />
                <span className="emblem-upload-action">{teamEmblem ? "Заменить" : "Выбрать файл"}</span>
              </label>
              <div className="form-grid two">
                <label><span>Капитан</span><input required readOnly value={registration.captain} placeholder="Игровой ник из профиля" /></label>
                <RoleSelect value={registration.captain_role} onChange={(value) => setRegistration({ ...registration, captain_role: value })} label="Роль капитана" />
              </div>
              <label className="captain-contact"><span>Связь с капитаном</span><input required value={registration.contact} onChange={(event) => setRegistration({ ...registration, contact: event.target.value })} placeholder="@username в Discord" /></label>
              <fieldset>
                <legend>Остальные игроки</legend>
                <p className="roles-hint">Укажите по одному игроку на каждую роль. Капитан может занимать любую позицию.</p>
                <div className="players-grid">
                  {([
                    ["player_2", "player_2_role"],
                    ["player_3", "player_3_role"],
                    ["player_4", "player_4_role"],
                    ["player_5", "player_5_role"],
                  ] as const).map(([playerField, roleField], index) => (
                    <div className="player-registration-row" key={playerField}>
                      <RoleIcon role={registration[roleField]} />
                      <label>
                        <span>Игрок {index + 2}</span>
                        <input list="registered-players" required value={registration[playerField]} onChange={(event) => setRegistration({ ...registration, [playerField]: event.target.value })} placeholder="Игровой ник из базы бота" />
                      </label>
                      <RoleSelect value={registration[roleField]} onChange={(value) => setRegistration({ ...registration, [roleField]: value })} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-label">
                <input type="checkbox" required checked={registration.rulesAccepted} onChange={(event) => setRegistration({ ...registration, rulesAccepted: event.target.checked })} />
                <span>Я подтверждаю состав и принимаю правила турнира</span>
              </label>
              <button className="primary-button submit-button" type="submit" disabled={saving || !registrationReady}>{saving ? "Отправляем…" : "Отправить заявку"} <FiArrowRight /></button>
            </form>
          </section>
        </div>
      )}

      {loginOpen && (
        <div className="modal-backdrop" onMouseDown={() => setLoginOpen(false)}>
          <section className="modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="Закрыть" onClick={() => setLoginOpen(false)}>×</button>
            {data.user?.avatarUrl ? (
              <Image
                className="profile-modal-avatar"
                src={data.user.avatarUrl}
                alt=""
                width={76}
                height={76}
                unoptimized
              />
            ) : (
              <div className="discord-modal-icon"><FaDiscord /></div>
            )}
            <h2 id="login-title">
              {data.user ? "Профиль участника" : "Вход через Discord"}
            </h2>
            <p className="modal-intro">
              {data.user
                ? "Данные профиля синхронизированы с регистрацией в боте."
                : "Сайт проверит ваш Discord-аккаунт и найдёт регистрацию в общей базе бота."}
            </p>
            {data.user ? (
              <div className="account-actions">
                <strong>{data.user.serverName}</strong>
                <span>Discord: {data.user.username}</span>
                <Link
                  className="primary-button"
                  href={`/players/${data.user.dotaId}`}
                >
                  Открыть страницу игрока <FiArrowRight />
                </Link>
                {data.user.isAdmin && (
                  <button
                    className="primary-button"
                    onClick={() => {
                      setLoginOpen(false);
                      setActiveTab("admin");
                    }}
                  >
                    Открыть панель организатора
                  </button>
                )}
                {data.applications
                  .filter((application) =>
                    application.members.some(
                      (member) =>
                        member.discord_id === data.user?.discordId &&
                        member.is_captain,
                    ),
                  )
                  .map((application) => (
                    <div className="captain-transfer" key={application.id}>
                      <span>
                        Капитан команды <strong>{application.team_name}</strong>
                      </span>
                      <select
                        value={captainChoices[application.id] ?? ""}
                        onChange={(event) =>
                          setCaptainChoices({
                            ...captainChoices,
                            [application.id]: event.target.value,
                          })
                        }
                      >
                        <option value="">Выберите нового капитана</option>
                        {application.members
                          .filter(
                            (member) =>
                              !member.is_captain &&
                              member.discord_id !== null &&
                              member.invitation_status === "accepted",
                          )
                          .map((member) => (
                            <option
                              value={member.discord_id!}
                              key={member.discord_id!}
                            >
                              {member.name}
                            </option>
                          ))}
                      </select>
                      <button
                        className="secondary-button"
                        disabled={!captainChoices[application.id]}
                        onClick={() => void transferCaptain(application.id)}
                      >
                        Передать капитанство
                      </button>
                    </div>
                  ))}
                <button
                  className="secondary-button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.reload();
                  }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                className="discord-login modal-discord-button"
                type="button"
                onClick={() => startDiscordLogin()}
              >
                <FaDiscord />
                Войти через Discord
              </button>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
