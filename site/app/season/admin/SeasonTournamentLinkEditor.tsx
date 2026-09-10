"use client";

import { type FormEvent, useState } from "react";
import { FiCheck, FiEdit3, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { fetchSiteRequest } from "@/lib/site-request";
import type { SeasonTournamentLinkId } from "../model/season-overview-model";

type SeasonTournamentLinkEditorProps = {
  linkId: SeasonTournamentLinkId;
  tournamentTitle: string;
};

export function SeasonTournamentLinkEditor({
  linkId,
  tournamentTitle,
}: SeasonTournamentLinkEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState("");

  async function saveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");

    try {
      const response = await fetchSiteRequest(
        "/api/admin/season-tournament-links",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ linkId, href }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не удалось сохранить ссылку");
        return;
      }

      setIsSaved(true);
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isSaved) return null;

  if (!isEditing) {
    return (
      <button
        className="season-link-edit-button"
        type="button"
        title={`Добавить ссылку на ${tournamentTitle}`}
        aria-label={`Добавить ссылку на ${tournamentTitle}`}
        onClick={() => setIsEditing(true)}
      >
        <FiEdit3 aria-hidden="true" />
      </button>
    );
  }

  return (
    <form className="season-link-editor" onSubmit={saveLink}>
      <label htmlFor={`season-tournament-link-${linkId}`}>
        Ссылка на турнир
      </label>
      <div className="season-link-editor-controls">
        <input
          id={`season-tournament-link-${linkId}`}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="/tournaments/... или адрес сайта"
          value={href}
          onChange={(event) => setHref(event.target.value)}
          disabled={isSaving}
          autoFocus
          required
        />
        <button
          type="submit"
          aria-label={`Сохранить ссылку на ${tournamentTitle}`}
          title="Сохранить"
          disabled={isSaving}
        >
          <FiCheck aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Отменить"
          title="Отменить"
          disabled={isSaving}
          onClick={() => {
            setIsEditing(false);
            setError("");
          }}
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      {error && (
        <span className="field-error season-link-editor-error">{error}</span>
      )}
    </form>
  );
}
