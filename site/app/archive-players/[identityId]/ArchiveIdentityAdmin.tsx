"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArchiveIdentityProfile } from "@/lib/player-identity-admin";

async function submitAdminAction(payload: Record<string, unknown>) {
  const response = await fetchSiteRequest("/api/admin/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let body: { error?: string } | null = null;
  try {
    body = JSON.parse(responseText) as { error?: string };
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(
      body?.error || responseText || "Не удалось сохранить изменения",
    );
  }
  return body;
}

export function ArchiveIdentityAdmin({
  profile,
}: {
  profile: ArchiveIdentityProfile;
}) {
  const router = useRouter();
  const [primaryNickname, setPrimaryNickname] = useState(
    profile.primaryNickname,
  );
  const [playerSearch, setPlayerSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const registeredMatches = useMemo(() => {
    const search = playerSearch.trim().toLocaleLowerCase("ru-RU");
    if (search.length < 2) return [];
    return profile.registeredCandidates
      .filter((candidate) =>
        [candidate.nickname, candidate.dotaId, candidate.discordId].some(
          (value) => value.toLocaleLowerCase("ru-RU").includes(search),
        ),
      )
      .slice(0, 12);
  }, [playerSearch, profile.registeredCandidates]);
  const archiveMatches = useMemo(() => {
    const search = archiveSearch.trim().toLocaleLowerCase("ru-RU");
    if (search.length < 2) return [];
    return profile.archiveCandidates
      .filter((candidate) =>
        [candidate.nickname, ...candidate.aliases].some((value) =>
          value.toLocaleLowerCase("ru-RU").includes(search),
        ),
      )
      .slice(0, 12);
  }, [archiveSearch, profile.archiveCandidates]);

  async function run(payload: Record<string, unknown>, success: string) {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await submitAdminAction(payload);
      setMessage(success);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить изменения",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function linkToRegistered(candidate: {
    discordId: string;
    dotaId: string;
    nickname: string;
  }) {
    setIsSaving(true);
    setError("");
    try {
      await submitAdminAction({
        action: "link-archive",
        identityId: profile.id,
        targetPlayerId: candidate.discordId,
      });
      router.push(`/players/${candidate.dotaId}`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось связать профили",
      );
      setIsSaving(false);
    }
  }

  function rename(event: FormEvent) {
    event.preventDefault();
    void run(
      {
        action: "rename-archive",
        identityId: profile.id,
        nickname: primaryNickname,
      },
      "Основной ник изменён.",
    );
  }

  function detachArchiveMember(member: {
    playerId: string;
    nickname: string;
  }) {
    if (
      !window.confirm(
        `Отделить архивный профиль ${member.nickname}? Его турнирная история сохранится в отдельном профиле.`,
      )
    ) {
      return;
    }
    void run(
      {
        action: "unlink-archive",
        identityId: profile.id,
        playerId: member.playerId,
      },
      `Профиль ${member.nickname} отделён.`,
    );
  }

  function mergeArchive(candidate: { id: string; nickname: string }) {
    if (
      !window.confirm(
        `Объединить ${candidate.nickname} с ${profile.primaryNickname}? Отменить это можно будет через список архивных записей.`,
      )
    ) {
      return;
    }
    void run(
      {
        action: "merge-archive",
        identityId: profile.id,
        sourceIdentityId: candidate.id,
      },
      `Профиль ${candidate.nickname} объединён с текущим.`,
    );
  }

  return (
    <section className="archive-player-card archive-player-admin">
      <div>
        <h2>Ники профиля</h2>
        <div className="archive-alias-list">
          {profile.aliases.map((alias) => (
            <span key={alias}>{alias}</span>
          ))}
        </div>
      </div>

      <form onSubmit={rename}>
        <label>
          <span>Основной ник</span>
          <select
            value={primaryNickname}
            onChange={(event) => setPrimaryNickname(event.target.value)}
          >
            {profile.aliases.map((alias) => (
              <option value={alias} key={alias}>
                {alias}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isSaving}>
          Сохранить основной ник
        </button>
      </form>

      {profile.members.length > 1 && (
        <div className="archive-link-section">
          <h2>Архивные записи в профиле</h2>
          <p>
            Если профили объединены ошибочно, отделите нужную запись. Результаты
            турниров не удалятся.
          </p>
          <div className="archive-candidate-list">
            {profile.members.map((member) => (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => detachArchiveMember(member)}
                key={member.playerId}
              >
                <strong>{member.nickname}</strong>
                <span>Отделить</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="archive-link-section">
        <h2>Связать с зарегистрированным участником</h2>
        <p>Введите минимум два символа ника, Dota ID или Discord ID.</p>
        <input
          type="search"
          value={playerSearch}
          onChange={(event) => setPlayerSearch(event.target.value)}
          placeholder="Начните вводить ник или ID"
        />
        {registeredMatches.length > 0 && (
          <div className="archive-candidate-list">
            {registeredMatches.map((candidate) => (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void linkToRegistered(candidate)}
                key={candidate.discordId}
              >
                <strong>{candidate.nickname}</strong>
                <span>Dota ID {candidate.dotaId}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="archive-link-section">
        <h2>Объединить с другим архивным профилем</h2>
        <p>
          Все ники и результаты выбранного профиля будут добавлены в текущий.
        </p>
        <input
          type="search"
          value={archiveSearch}
          onChange={(event) => setArchiveSearch(event.target.value)}
          placeholder="Начните вводить архивный ник"
        />
        {archiveMatches.length > 0 && (
          <div className="archive-candidate-list">
            {archiveMatches.map((candidate) => (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => mergeArchive(candidate)}
                key={candidate.id}
              >
                <strong>{candidate.nickname}</strong>
                <span>{candidate.aliases.join(", ")}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {message && <p className="archive-admin-message success">{message}</p>}
      {error && <p className="archive-admin-message error">{error}</p>}
    </section>
  );
}
