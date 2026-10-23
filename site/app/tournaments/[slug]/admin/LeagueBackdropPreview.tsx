"use client";

import { useLeagueBackdrop } from "../hooks/useLeagueBackdrop";
import { leagueBackdropOptions } from "../model/league-backdrops";

export function LeagueBackdropPicker({ organizerId }: { organizerId: string }) {
  const { selected, select } = useLeagueBackdrop(organizerId);
  return <label className="league-backdrop-picker">
    <span>Подсветка турнира · только для вас</span>
    <select aria-label="Оформление фона турнира" value={selected} onChange={(event) => select(event.target.value)}>
      <option value="none">Без подсветки</option>
      {leagueBackdropOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  </label>;
}
