"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LinkedArchiveProfile } from "@/lib/player-profile-organizer";

export function LinkedArchiveProfilesCard({
  profiles,
}: {
  profiles: LinkedArchiveProfile[];
}) {
  const router = useRouter();
  const [confirmPlayerId, setConfirmPlayerId] = useState<string | null>(null);
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function unlink(profile: LinkedArchiveProfile) {
    setPendingPlayerId(profile.playerId);
    setError("");
    try {
      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlink-archive",
          playerId: profile.playerId,
        }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Не удалось отвязать профиль");
      }
      setConfirmPlayerId(null);
      router.refresh();
    } catch (unlinkError) {
      setError(
        unlinkError instanceof Error
          ? unlinkError.message
          : "Не удалось отвязать профиль",
      );
    } finally {
      setPendingPlayerId(null);
    }
  }

  return (
    <section className="profile-side-card linked-archive-card">
      <p className="section-kicker">Только для организатора</p>
      <h2>Связанные архивные профили</h2>
      {profiles.length ? (
        <div className="linked-archive-list">
          {profiles.map((profile) => (
            <article key={profile.playerId}>
              <div className="linked-archive-summary">
                <strong>{profile.primaryNickname}</strong>
                {profile.aliases.length > 1 && (
                  <span>
                    Другие ники:{" "}
                    {profile.aliases
                      .filter(
                        (alias) =>
                          alias.localeCompare(
                            profile.primaryNickname,
                            "ru-RU",
                            { sensitivity: "accent" },
                          ) !== 0,
                      )
                      .join(", ")}
                  </span>
                )}
              </div>
              {confirmPlayerId === profile.playerId ? (
                <div className="linked-archive-confirm">
                  <span>
                    Отвязать профиль? Турнирная история не удалится.
                  </span>
                  <div>
                    <button
                      type="button"
                      className="linked-archive-unlink confirm"
                      disabled={pendingPlayerId === profile.playerId}
                      onClick={() => unlink(profile)}
                    >
                      {pendingPlayerId === profile.playerId
                        ? "Отвязываю…"
                        : "Да, отвязать"}
                    </button>
                    <button
                      type="button"
                      className="linked-archive-unlink"
                      disabled={pendingPlayerId === profile.playerId}
                      onClick={() => setConfirmPlayerId(null)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="linked-archive-unlink"
                  onClick={() => {
                    setError("");
                    setConfirmPlayerId(profile.playerId);
                  }}
                >
                  Отвязать
                </button>
              )}
            </article>
          ))}
          {error && <p className="form-error">{error}</p>}
        </div>
      ) : (
        <p className="profile-card-note">
          К этому участнику архивные профили не привязаны.
        </p>
      )}
    </section>
  );
}
