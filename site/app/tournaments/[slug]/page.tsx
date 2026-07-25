"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FaCrown, FaDiscord, FaHandHoldingMedical } from "react-icons/fa";
import { FiArrowRight, FiArrowUpRight, FiMoon, FiSun, FiUploadCloud } from "react-icons/fi";
import { GiBoltShield, GiBowArrow, GiFlame, GiSwordWound } from "react-icons/gi";
import { isPastTournament } from "@/lib/tournaments";
import { OrganizerAccess } from "../OrganizerAccess";
import { ArchiveRosterEditor } from "./ArchiveRosterEditor";

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
  scheduled_at: string;
  stage: string;
  team_a: string;
  team_b: string;
  team_a_application_id: number | null;
  team_b_application_id: number | null;
  team_a_score: number | null;
  team_b_score: number | null;
  result_type: "normal" | "technical" | "forfeit" | "cancelled";
  team_a_result_label: string | null;
  team_b_result_label: string | null;
  decision_note: string | null;
  bracket_round: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
  bracket_slot: number | null;
  best_of: number;
  sort_order: number;
  status: "scheduled" | "ready" | "live" | "finished" | "cancelled";
  team_a_checked_in: boolean;
  team_b_checked_in: boolean;
};

type Standing = {
  id: number;
  tournament_id: number;
  group_name: string;
  place: number;
  team_name: string;
  games: number;
  wins: number;
  losses: number;
  points: number;
};

type TournamentGroup = {
  id: number;
  tournament_id: number;
  name: string;
  sort_order: number;
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

export default function Home() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const tournamentSlug = params.slug;
  const [data, setData] = useState<SiteData | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [tournamentDraft, setTournamentDraft] = useState<Tournament | null>(null);
  const [registration, setRegistration] = useState<RegistrationForm>(emptyRegistration);
  const [teamEmblem, setTeamEmblem] = useState<File | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [registrationAvailable, setRegistrationAvailable] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [matchDraft, setMatchDraft] = useState<MatchDraft>(emptyMatchDraft);
  const [groupCount, setGroupCount] = useState(2);
  const [captainChoices, setCaptainChoices] = useState<Record<number, string>>(
    {},
  );
  const [rulesText, setRulesText] = useState("");
  const [prizeDrafts, setPrizeDrafts] = useState<
    Array<{
      placement: number;
      applicationId: number | null;
      teamName: string;
      prizeText: string;
    }>
  >([]);

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
      setTournamentDraft(nextData.tournament);
      setRulesText(nextData.rules.map((rule) => rule.rule_text).join("\n"));
      setPrizeDrafts(
        nextData.prizes.map((prize) => ({
          placement: prize.placement,
          applicationId: prize.application_id,
          teamName: prize.team_name,
          prizeText: prize.prize_text ?? "",
        })),
      );
      if (nextData.user?.isAdmin && searchParams.get("manage") === "1") {
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
  }, [searchParams, tournamentSlug]);

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
    const groups = new Map<string, Standing[]>();
    for (const row of data?.standings ?? []) {
      const rows = groups.get(row.group_name) ?? [];
      rows.push(row);
      groups.set(row.group_name, rows);
    }
    return Array.from(groups.entries());
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

  function switchTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem("ls-theme", nextTheme);
  }

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

  async function saveTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournamentDraft) return;
    setSaving(true);

    const response = await fetch("/api/tournament", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(tournamentDraft),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setToast(result.error ?? "Не удалось сохранить турнир");
      return;
    }

    setToast("Изменения турнира сохранены в базе");
    await loadData();
  }

  function setTournamentField(field: keyof Tournament, value: string | number) {
    setTournamentDraft((current) => current ? { ...current, [field]: value } : current);
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
      body: JSON.stringify({ tournamentId: tournament.id, groupCount }),
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
    const response = await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: match.id,
        status: String(form.get("status")),
        teamAScore: rawTeamAScore ? Number(rawTeamAScore) : null,
        teamBScore: rawTeamBScore ? Number(rawTeamBScore) : null,
        resultType: String(form.get("resultType")),
        teamAResultLabel: String(form.get("teamAResultLabel") ?? "").trim() || null,
        teamBResultLabel: String(form.get("teamBResultLabel") ?? "").trim() || null,
        decisionNote: String(form.get("decisionNote") ?? "").trim() || null,
        bracketRound: rawBracketRound ? Number(rawBracketRound) : null,
        bracketSide: String(form.get("bracketSide") ?? "").trim() || null,
        bracketSlot: rawBracketSlot ? Number(rawBracketSlot) : null,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok ? "Результат матча сохранён" : result.error ?? "Ошибка",
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

  async function saveTournamentContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/tournament-content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tournamentId: tournament.id,
        rules: rulesText
          .split("\n")
          .map((rule) => rule.trim())
          .filter(Boolean),
        prizes: prizeDrafts.map((prize) => ({
          placement: prize.placement,
          applicationId: prize.applicationId,
          teamName: prize.teamName,
          prizeText: prize.prizeText,
        })),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok
        ? "Регламент и призовые сохранены"
        : result.error ?? "Не удалось сохранить данные турнира",
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
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Linken's Sphere Esports">
          <Image src="/linkens-sphere-logo.png" alt="Логотип Linken's Sphere Esports" width={48} height={48} priority unoptimized />
          <span>
            <strong>Linken&apos;s Sphere</strong>
            <small>Esports community</small>
          </span>
        </Link>

        <nav className="platform-navigation" aria-label="Главная навигация">
          <Link href="/">Главная</Link>
          <Link className="active" href="/tournaments" aria-current="page">
            Турниры
          </Link>
          <a href={tournament.discord_url} target="_blank" rel="noreferrer">
            Наш Discord <FiArrowUpRight aria-hidden="true" />
          </a>
        </nav>

        <div className="header-actions">
          <button className="theme-button" onClick={switchTheme} aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}>
            {theme === "light" ? <FiMoon /> : <FiSun />}
          </button>
          {data.user ? (
            <button
              className="player-profile-button"
              onClick={() =>
                window.location.assign(`/players/${data.user?.dotaId}`)
              }
            >
              {data.user.avatarUrl ? (
                <Image
                  className="player-profile-avatar"
                  src={data.user.avatarUrl}
                  alt=""
                  width={38}
                  height={38}
                  unoptimized
                />
              ) : (
                <span className="player-profile-avatar fallback">
                  {data.user.playerName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="player-profile-copy">
                <strong>{data.user.serverName}</strong>
                <small>Профиль участника</small>
              </span>
            </button>
          ) : (
            <button className="discord-login" onClick={() => startDiscordLogin()}>
              <FaDiscord aria-hidden="true" />
              <span>Вход через Discord</span>
            </button>
          )}
        </div>
      </header>

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
            <div><small>Регион</small><strong>{tournament.region}</strong></div>
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
          <div>
            <p className="section-kicker">
              {isPast ? "История турниров" : "Турнир сообщества"}
            </p>
            <h2>{tournament.name}</h2>
          </div>
          <div className="countdown">
            {isPast ? (
              <>
                <span>Статус</span>
                <strong>✓</strong>
                <span>{tournament.status === "archived" ? "в архиве" : "завершён"}</span>
              </>
            ) : (
              <>
                <span>До начала</span>
                <strong>{daysLeft}</strong>
                <span>дней</span>
              </>
            )}
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Разделы турнира">
          {[
            ["overview", "Обзор"],
            ["teams", `Команды ${approvedTeams.length}/${tournament.max_teams}`],
            ["matches", "Матчи"],
            ["standings", "Таблица"],
            ...(data.rules.length ? [["rules", "Регламент"]] : []),
            ...(adminMode ? [["admin", `Управление${pendingTeams.length ? ` · ${pendingTeams.length}` : ""}`]] : []),
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

        {activeTab === "overview" && (
          <div className="overview-grid tab-panel">
            <article className="content-card about-card">
              <p className="card-kicker">О турнире</p>
              <h3>{tournament.headline} {tournament.headline_accent}</h3>
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
            <aside className="details-card">
              <div><span>Сервер</span><strong>{tournament.server}</strong></div>
              <div><span>Сбор участников</span><strong>Discord Linken&apos;s Sphere</strong></div>
              <div>
                <span>Check-in</span>
                <strong>
                  Капитан подтверждает готовность за{" "}
                  {tournament.check_in_minutes} минут до матча
                </strong>
              </div>
              <div><span>Даты</span><strong>{formatShortDate(tournament.start_at)} — {formatShortDate(tournament.end_at)}</strong></div>
              <a href={tournament.discord_url} target="_blank" rel="noreferrer">
                Задать вопрос в Discord <FiArrowUpRight />
              </a>
            </aside>
            {data.prizes.length > 0 && (
              <article className="content-card tournament-prizes">
                <p className="card-kicker">Призовые места</p>
                <h3>Итоги и награды</h3>
                <div className="prize-list">
                  {data.prizes.map((prize) => (
                    <div key={prize.id}>
                      <strong>{prize.placement}</strong>
                      <span>{prize.team_name}</span>
                      <b>{prize.prize_text || "—"}</b>
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
                  <span className="checkin-state">
                    {match.team_a_checked_in ? "A ✓" : "A —"} ·{" "}
                    {match.team_b_checked_in ? "B ✓" : "B —"}
                  </span>
                  {data.user &&
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

        {activeTab === "standings" && (
          <div className="tab-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Групповой этап</p>
                <h3>Турнирное положение</h3>
              </div>
              <span className="timezone">Победа · 3 очка</span>
            </div>
            <div className="standings-groups">
              {standingGroups.map(([groupName, rows]) => (
                <section className="standing-group" key={groupName}>
                  <h4>{groupName}</h4>
                  <div className="standings">
                    <div className="standing-row standing-head">
                      <span>#</span><span>Команда</span><span>И</span><span>В</span><span>П</span><span>Очки</span>
                    </div>
                    {rows.map((row) => (
                      <div className="standing-row" key={row.id}>
                        <span className="place">{row.place}</span>
                        <span className="standing-team"><i>{initials(row.team_name)}</i><strong>{row.team_name}</strong></span>
                        <span>{row.games}</span><span>{row.wins}</span><span>{row.losses}</span><strong>{row.points}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {!standingGroups.length && (
                <div className="empty-standings">Группы ещё не сформированы</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="tab-panel rules-panel">
            <div className="panel-heading">
              <div>
                <p className="card-kicker">Документы турнира</p>
                <h3>Дополнительный регламент</h3>
              </div>
              <span className="timezone">{data.rules.length} пунктов</span>
            </div>
            <ol className="tournament-rules-list">
              {data.rules.map((rule) => (
                <li key={rule.id}>{rule.rule_text}</li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === "admin" && adminMode && tournamentDraft && (
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
                  количеством групп.
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
              <button
                className="secondary-button"
                type="button"
                onClick={() => void generateGroups()}
                disabled={approvedTeams.length < 2}
              >
                Сформировать группы
              </button>
            </div>

            <form className="tournament-editor" onSubmit={saveTournament}>
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">Редактор турнира</p>
                  <h3>Основная информация</h3>
                </div>
                <button className="primary-button compact" type="submit" disabled={saving}>
                  {saving ? "Сохраняем…" : "Сохранить изменения"}
                </button>
              </div>

              <div className="editor-grid">
                {editableTournamentFields.map((field) => (
                  <label className={["description", "about"].includes(field) ? "wide-field" : ""} key={field}>
                    <span>{({
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
                      playoff_format: "Плей-офф",
                      final_format: "Гранд-финал",
                      discord_url: "Ссылка Discord",
                    } as Record<string, string>)[field]}</span>
                    {["description", "about"].includes(field) ? (
                      <textarea value={String(tournamentDraft[field])} onChange={(event) => setTournamentField(field, event.target.value)} />
                    ) : (
                      <input value={String(tournamentDraft[field])} onChange={(event) => setTournamentField(field, event.target.value)} />
                    )}
                  </label>
                ))}

                <label>
                  <span>Начало турнира</span>
                  <input type="datetime-local" value={toDateTimeInput(tournamentDraft.start_at)} onChange={(event) => setTournamentField("start_at", fromDateTimeInput(event.target.value))} />
                </label>
                <label>
                  <span>Окончание турнира</span>
                  <input type="datetime-local" value={toDateTimeInput(tournamentDraft.end_at)} onChange={(event) => setTournamentField("end_at", fromDateTimeInput(event.target.value))} />
                </label>
                <label>
                  <span>Дедлайн регистрации</span>
                  <input type="datetime-local" value={toDateTimeInput(tournamentDraft.registration_deadline)} onChange={(event) => setTournamentField("registration_deadline", fromDateTimeInput(event.target.value))} />
                </label>
                <label>
                  <span>Количество игроков</span>
                  <input type="number" min="1" max="10" value={tournamentDraft.team_size} onChange={(event) => setTournamentField("team_size", Number(event.target.value))} />
                </label>
                <label>
                  <span>Количество команд</span>
                  <input type="number" min="2" max="64" value={tournamentDraft.max_teams} onChange={(event) => setTournamentField("max_teams", Number(event.target.value))} />
                </label>
                <label>
                  <span>Check-in, минут</span>
                  <input type="number" min="5" max="180" value={tournamentDraft.check_in_minutes} onChange={(event) => setTournamentField("check_in_minutes", Number(event.target.value))} />
                </label>
                <label>
                  <span>Рабочий статус</span>
                  <select
                    value={tournamentDraft.status}
                    onChange={(event) =>
                      setTournamentField("status", event.target.value)
                    }
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

            <form
              className="applications-panel tournament-content-editor"
              onSubmit={saveTournamentContent}
            >
              <div className="editor-heading">
                <div>
                  <p className="card-kicker">Содержание турнира</p>
                  <h3>Регламент и призовые</h3>
                  <p>
                    Каждый пункт регламента вводится с новой строки. Призовые
                    можно оставить без суммы, если в архиве она не указана.
                  </p>
                </div>
                <button type="submit">Сохранить</button>
              </div>
              <label className="content-rules-field">
                <span>Дополнительные правила</span>
                <textarea
                  rows={12}
                  value={rulesText}
                  onChange={(event) => setRulesText(event.target.value)}
                  placeholder={"Первый пункт регламента\nВторой пункт регламента"}
                />
              </label>
              <div className="prize-admin-list">
                {prizeDrafts.map((prize, index) => (
                  <div className="prize-admin-row" key={`${prize.placement}-${index}`}>
                    <label>
                      <span>Место</span>
                      <input
                        type="number"
                        min="1"
                        max="64"
                        value={prize.placement}
                        onChange={(event) =>
                          setPrizeDrafts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, placement: Number(event.target.value) }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Команда</span>
                      <select
                        value={prize.applicationId ?? ""}
                        onChange={(event) => {
                          const applicationId = Number(event.target.value);
                          const team = data.applications.find(
                            (application) => application.id === applicationId,
                          );
                          setPrizeDrafts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    applicationId: applicationId || null,
                                    teamName: team?.team_name ?? "",
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <option value="">Выберите команду</option>
                        {data.applications.map((application) => (
                          <option value={application.id} key={application.id}>
                            {application.team_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Награда</span>
                      <input
                        maxLength={160}
                        value={prize.prizeText}
                        onChange={(event) =>
                          setPrizeDrafts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, prizeText: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Например: 4 000 ₽"
                      />
                    </label>
                    <button
                      className="danger"
                      type="button"
                      onClick={() =>
                        setPrizeDrafts((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Удалить
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPrizeDrafts((current) => [
                      ...current,
                      {
                        placement: current.length + 1,
                        applicationId: null,
                        teamName: "",
                        prizeText: "",
                      },
                    ])
                  }
                >
                  + Добавить призовое место
                </button>
              </div>
            </form>

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
                      <p>
                        {getTeamPlayers(application)
                          .map((player) => {
                            const role = roleOptions.find((option) => option.value === player.role);
                            return `${role?.position ?? "—"}. ${player.name}${player.isCaptain ? " (капитан)" : ""}`;
                          })
                          .join(" · ")}
                      </p>
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
                    Никнейм связывается с профилем автоматически при точном
                    совпадении. Если профиль не найден, имя останется обычным
                    текстом. Указанные здесь тиры навсегда относятся именно к
                    этому турниру.
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
              <form className="match-editor" onSubmit={createMatch}>
                <label>
                  <span>Этап</span>
                  <input
                    required
                    value={matchDraft.stage}
                    onChange={(event) =>
                      setMatchDraft({ ...matchDraft, stage: event.target.value })
                    }
                    placeholder="Групповой этап"
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
                  <span>Формат</span>
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
                <label>
                  <span>Секция сетки</span>
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
                  <span>Раунд сетки</span>
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
                  <span>Позиция в раунде</span>
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
                <label>
                  <span>Команда A</span>
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
                  {!matchDraft.teamAId && (
                    <input
                      required
                      value={matchDraft.teamAPlaceholder}
                      onChange={(event) =>
                        setMatchDraft({
                          ...matchDraft,
                          teamAPlaceholder: event.target.value,
                        })
                      }
                      placeholder="Например: 1 место группы А"
                    />
                  )}
                </label>
                <label>
                  <span>Команда B</span>
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
                  {!matchDraft.teamBId && (
                    <input
                      required
                      value={matchDraft.teamBPlaceholder}
                      onChange={(event) =>
                        setMatchDraft({
                          ...matchDraft,
                          teamBPlaceholder: event.target.value,
                        })
                      }
                      placeholder="Например: 2 место группы Б"
                    />
                  )}
                </label>
                <button className="primary-button compact" type="submit">
                  Добавить матч
                </button>
              </form>

              <div className="match-result-list">
                {data.matches.map((match) => (
                  <form
                    className="match-result-row"
                    key={match.id}
                    onSubmit={(event) => void saveMatchResult(event, match)}
                  >
                    <div>
                      <strong>
                        {match.team_a} — {match.team_b}
                      </strong>
                      <span>
                        {match.stage} · {formatDayMonth(match.scheduled_at)}{" "}
                        {formatTime(match.scheduled_at)} · BO{match.best_of}
                      </span>
                    </div>
                    <input
                      aria-label={`Счёт ${match.team_a}`}
                      name="teamAScore"
                      type="number"
                      min="0"
                      defaultValue={match.team_a_score ?? ""}
                    />
                    <span>:</span>
                    <input
                      aria-label={`Счёт ${match.team_b}`}
                      name="teamBScore"
                      type="number"
                      min="0"
                      defaultValue={match.team_b_score ?? ""}
                    />
                    <select name="status" defaultValue={match.status}>
                      <option value="scheduled">Запланирован</option>
                      <option value="ready">Команды готовы</option>
                      <option value="live">Идёт</option>
                      <option value="finished">Завершён</option>
                      <option value="cancelled">Отменён</option>
                    </select>
                    <select name="resultType" defaultValue={match.result_type}>
                      <option value="normal">Обычный результат</option>
                      <option value="technical">Технический результат</option>
                      <option value="forfeit">Отказ от игры</option>
                      <option value="cancelled">Матч отменён</option>
                    </select>
                    <input
                      name="teamAResultLabel"
                      maxLength={20}
                      defaultValue={match.team_a_result_label ?? ""}
                      placeholder="A: tw / tl"
                    />
                    <input
                      name="teamBResultLabel"
                      maxLength={20}
                      defaultValue={match.team_b_result_label ?? ""}
                      placeholder="B: tw / tl"
                    />
                    <select
                      name="bracketSide"
                      defaultValue={match.bracket_side ?? ""}
                    >
                      <option value="">Без секции сетки</option>
                      <option value="group">Групповой этап</option>
                      <option value="upper">Верхняя сетка</option>
                      <option value="lower">Нижняя сетка</option>
                      <option value="grand_final">Гранд-финал</option>
                    </select>
                    <input
                      name="bracketRound"
                      type="number"
                      min="1"
                      defaultValue={match.bracket_round ?? ""}
                      placeholder="Раунд"
                    />
                    <input
                      name="bracketSlot"
                      type="number"
                      min="1"
                      defaultValue={match.bracket_slot ?? ""}
                      placeholder="Позиция"
                    />
                    <textarea
                      name="decisionNote"
                      defaultValue={match.decision_note ?? ""}
                      placeholder="Комментарий организатора к техническому результату"
                    />
                    <button type="submit">Сохранить</button>
                  </form>
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

      <div className="mobile-cta">
        <div><small>{tournament.name}</small><strong>{formatDayMonth(tournament.start_at)} — {formatDayMonth(tournament.end_at)}</strong></div>
        {canRegister ? (
          <button onClick={openRegistration}>Подать заявку</button>
        ) : (
          <button onClick={openMatches}>
            {isPast ? "Результаты" : "Матчи"}
          </button>
        )}
      </div>

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
