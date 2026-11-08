"use client";

import { roleOptions } from "../model/constants";
import type { PlayerRole, TournamentRosterRole } from "../model/types";

export function RoleIcon({ role }: { role: TournamentRosterRole }) {
  if (role === "coach") {
    return (
      <span className="role-icon role-coach" aria-label="Тренер" title="Тренер">
        <span className="role-icon-symbol" aria-hidden="true" />
      </span>
    );
  }
  const details =
    roleOptions.find((option) => option.value === role) ?? roleOptions[0];
  return (
    <span
      className={`role-icon role-${role}`}
      aria-label={`${details.position}-я позиция, ${details.label}`}
      title={`${details.position}-я позиция · ${details.label}`}
    >
      <span className="role-icon-symbol" aria-hidden="true" />
    </span>
  );
}

export function RoleSelect({
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as PlayerRole)}
      >
        {roleOptions.map((role) => (
          <option key={role.value} value={role.value}>
            {role.position} · {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}
