"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useServerClock } from "@/hooks/useServerClock";
import { moscowDateTimeInputToIso } from "@/lib/moscow-date-time";
import { announcePlayerActionNotificationsChanged } from "@/lib/player-action-notification-events";
import { tournamentHasStarted } from "@/lib/tournaments";
import { emptyMatchDraft, emptyRegistration, roleOptions } from "../model/constants";
import { getTeamNameError } from "../model/formatters";
import { buildMatchResultPayload } from "../model/match-result-payload";
import { startDiscordLogin } from "../services/discord-login";
import { useSeasonController } from "./useSeasonController";
import { useTournamentCheckIn } from "./useTournamentCheckIn";
import type { MatchDraft, RegistrationForm, TeamApplication } from "../model/types";
import type { TournamentMatch, TournamentSiteData, TournamentTab } from "../model/types";

export function useTournamentController() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const tournamentSlug = params.slug;
  const manageRequested = searchParams.get("manage") === "1";
  const [data, setData] = useState<TournamentSiteData | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [activeTab, setActiveTab] = useState<TournamentTab>("overview");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [registration, setRegistration] =
    useState<RegistrationForm>(emptyRegistration);
  const [teamEmblem, setTeamEmblem] = useState<File | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [matchDraft, setMatchDraft] = useState<MatchDraft>(emptyMatchDraft);
  const [groupCount, setGroupCount] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [captainChoices, setCaptainChoices] = useState<Record<number, string>>(
    {},
  );
  const season = useSeasonController({
    enabled: data?.tournament.tournament_type === "seasonal",
    setActiveTab,
    setMessage: setToast,
    slug: tournamentSlug,
  });
  const currentTimeMs = useServerClock(data?.generatedAt);
  const daysLeft =
    data && Number.isFinite(currentTimeMs)
      ? Math.max(
          0,
          Math.ceil(
            (new Date(data.tournament.start_at).getTime() - currentTimeMs) /
              86_400_000,
          ),
        )
      : 0;
  const hasTournamentStarted = Boolean(
    data &&
      Number.isFinite(currentTimeMs) &&
      tournamentHasStarted(data.tournament.start_at, currentTimeMs),
  );
  const registrationAvailable = Boolean(
    data &&
      Number.isFinite(currentTimeMs) &&
      new Date(data.tournament.registration_deadline).getTime() > currentTimeMs,
  );
  const loadData = useCallback(async () => {
    try {
      const response = await fetchSiteRequest(
        `/api/tournament?slug=${encodeURIComponent(tournamentSlug)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const errorResult = (await response.json()) as {
          error?: string;
        };
        throw new Error(errorResult.error ?? "Не удалось загрузить турнир");
      }

      const nextData = (await response.json()) as TournamentSiteData;
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
      }
      setLoadingError("");
    } catch (error) {
      setLoadingError(
        error instanceof Error ? error.message : "Ошибка загрузки",
      );
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
  const standingGroups = useMemo(
    () =>
      (data?.groups ?? []).map((group) => ({
        group,
        rows: (data?.standings ?? []).filter(
          (row) => row.group_id === group.id,
        ),
      })),
    [data],
  );
  const tournamentCheckIn = useTournamentCheckIn({
    currentTimeMs,
    data,
    onMessage: setToast,
    onReload: loadData,
  });

  const teamNameError = getTeamNameError(registration.team_name);
  const registrationReady =
    !teamNameError &&
    Boolean(teamEmblem) &&
    registration.rulesAccepted &&
    new Set([
      registration.captain_role,
      registration.player_2_role,
      registration.player_3_role,
      registration.player_4_role,
      registration.player_5_role,
    ]).size === roleOptions.length &&
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

  function openRegistration() {
    if (!data?.user) {
      setLoginOpen(true);
      return;
    }
    setRegistrationOpen(true);
  }

  function openTournamentTab(
    tab: Extract<TournamentTab, "overview" | "matches" | "playoffs">,
  ) {
    setActiveTab(tab);
    window.requestAnimationFrame(() =>
      document.getElementById("tournament")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
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

    try {
      const response = await fetchSiteRequest("/api/applications", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string };
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
    } catch {
      setToast("Сервер недоступен. Проверьте соединение и попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  async function updateApplicationStatus(
    id: number,
    status: TeamApplication["status"],
  ) {
    const response = await fetchSiteRequest("/api/applications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setToast(result.error ?? "Не удалось изменить заявку");
      return;
    }
    setToast(
      status === "approved"
        ? "Команда допущена к турниру"
        : "Заявка отклонена",
    );
    await loadData();
  }

  async function deleteApplication(id: number, teamName: string) {
    if (!window.confirm(`Удалить отклонённую заявку команды «${teamName}»?`)) {
      return;
    }
    const response = await fetchSiteRequest(`/api/applications?id=${id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setToast(result.error ?? "Не удалось удалить заявку");
      return;
    }
    setToast("Отклонённая заявка удалена");
    await loadData();
  }

  async function answerInvitation(
    applicationId: number,
    invitationStatus: "accepted" | "declined",
  ) {
    const response = await fetchSiteRequest("/api/applications", {
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
    announcePlayerActionNotificationsChanged();
  }

  async function generateGroups(action: "form" | "shuffle" = "form") {
    if (!data) return;
    const response = await fetchSiteRequest("/api/admin/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        tournamentId: data.tournament.id,
        groupCount,
        teamsPerGroup,
      }),
    });
    const result = (await response.json()) as { error?: string; groupMatchCount?: number };
    setToast(
      response.ok
        ? action === "shuffle"
          ? `Шаффл завершён · создано матчей: ${result.groupMatchCount ?? 0}`
          : `Группы и матчи сформированы · матчей: ${result.groupMatchCount ?? 0}`
        : result.error ?? "Не удалось сформировать группы",
    );
    if (response.ok) await loadData();
  }

  async function createMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const response = await fetchSiteRequest("/api/admin/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tournamentId: data.tournament.id,
        groupId: matchDraft.groupId ? Number(matchDraft.groupId) : null,
        scheduledAt: moscowDateTimeInputToIso(matchDraft.scheduledAt),
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
        sortOrder: data.matches.length,
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
    match: TournamentMatch,
  ) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    const resultPayload = buildMatchResultPayload(
      form,
      match,
      data.tournament.id,
    );
    if (resultPayload.error) {
      setToast(resultPayload.error);
      return;
    }

    const response = await fetchSiteRequest("/api/admin/matches", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(resultPayload.payload),
    });
    const result = (await response.json()) as { error?: string };
    setToast(
      response.ok ? "Результат матча сохранён" : result.error ?? "Ошибка",
    );
    if (response.ok) await loadData();
  }

  async function deleteMatch(match: TournamentMatch) {
    if (!window.confirm(`Удалить матч ${match.team_a} — ${match.team_b}?`)) {
      return;
    }
    const response = await fetchSiteRequest(`/api/admin/matches?id=${match.id}`, {
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
    const response = await fetchSiteRequest("/api/admin/tournament-results", {
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
    const response = await fetchSiteRequest("/api/applications", {
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

  return {
    activeTab,
    adminMode,
    answerInvitation,
    approvedTeams,
    captainApplications: tournamentCheckIn.captainApplications,
    captainChoices,
    checkIn: tournamentCheckIn.checkIn,
    checkInWindow: tournamentCheckIn.checkInWindow,
    createMatch,
    data,
    daysLeft,
    deleteApplication,
    deleteMatch,
    generateGroups,
    groupCount,
    hasTournamentStarted,
    loadData,
    loadingError,
    loginOpen,
    matchDraft,
    openRegistration,
    openTournamentTab,
    pendingTeams,
    registration,
    registrationAvailable,
    registrationOpen,
    registrationReady,
    saveMatchResult,
    saveTeamResult,
    saving,
    season,
    setActiveTab,
    setCaptainChoices,
    setGroupCount,
    setLoginOpen,
    setMatchDraft,
    setRegistration,
    setRegistrationOpen,
    setTeamEmblem,
    setTeamsPerGroup,
    setTheme,
    setToast,
    standingGroups,
    startDiscordLogin,
    submitRegistration,
    teamEmblem,
    teamNameError,
    teamsPerGroup,
    theme,
    toast,
    transferCaptain,
    updateApplicationStatus,
  };
}

export type TournamentController = ReturnType<typeof useTournamentController>;
