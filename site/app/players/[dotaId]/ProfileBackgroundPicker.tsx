"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiImage, FiX } from "react-icons/fi";
import type { ProfileBackgroundKey } from "@/lib/player-profile";

const backgrounds: Array<{
  key: ProfileBackgroundKey;
  label: string;
}> = [
  { key: "default", label: "Стандартный" },
  { key: "regeneration", label: "Регенерация" },
  { key: "haste", label: "Ускорение" },
  { key: "invisibility", label: "Невидимость" },
  { key: "arcane", label: "Волшебство" },
  { key: "illusion", label: "Иллюзии" },
  { key: "damage", label: "Усиление урона" },
];

export function ProfileBackgroundPicker({
  dotaId,
  currentKey,
}: {
  dotaId: string;
  currentKey: ProfileBackgroundKey;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(backgroundKey: ProfileBackgroundKey) {
    if (saving) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/players/${dotaId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ backgroundKey }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Не удалось изменить фон");
      return;
    }
    setSelected(backgroundKey);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="profile-background-control">
      <button
        className="profile-background-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="profile-background-options"
      >
        {open ? <FiX aria-hidden="true" /> : <FiImage aria-hidden="true" />}
        Изменить фон
      </button>
      {open && (
        <div className="profile-background-options" id="profile-background-options">
          <strong>Фон профиля</strong>
          <div>
            {backgrounds.map((background) => (
              <button
                className={`profile-background-choice background-${background.key}`}
                type="button"
                key={background.key}
                disabled={saving}
                onClick={() => void save(background.key)}
              >
                <span />
                <b>{background.label}</b>
                {selected === background.key && <FiCheck aria-hidden="true" />}
              </button>
            ))}
          </div>
          {error && <p>{error}</p>}
        </div>
      )}
    </div>
  );
}
