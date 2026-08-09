"use client";

import { FaHandHoldingMedical, FaUserTie } from "react-icons/fa";
import { GiBoltShield, GiBowArrow, GiFlame, GiSwordWound } from "react-icons/gi";
import { roleOptions } from "../model/constants";
import type { PlayerRole, TournamentRosterRole } from "../model/types";

export function RoleIcon({ role }: { role: TournamentRosterRole }) {
  if (role === "coach") {
    return (
      <span className="role-icon role-coach" aria-label="Тренер" title="Тренер">
        <FaUserTie aria-hidden="true" />
      </span>
    );
  }
  const details =
    roleOptions.find((option) => option.value === role) ?? roleOptions[0];
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
