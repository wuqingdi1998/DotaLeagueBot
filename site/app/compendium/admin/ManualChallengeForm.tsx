"use client";
import { useState } from "react";
import type { HistoricalChallenge, HistoricalChallenges } from "./challenge-history-types";

export function ManualChallengeForm({ card, clanMates, isPending, onSave, onCancel }: {
  card: HistoricalChallenge; clanMates: HistoricalChallenges["clanMates"]; isPending: boolean;
  onSave: (details: { matchIds: string[]; heroId?: number; partnerPlayerId?: string }) => void;
  onCancel: () => void;
}) {
  const [matches, setMatches] = useState("");
  const [heroId, setHeroId] = useState(String(card.heroes[0]?.id ?? ""));
  const [partnerPlayerId, setPartnerPlayerId] = useState("");
  return <form className="compendium-base-manual-form" onSubmit={(event) => {
    event.preventDefault();
    onSave({ matchIds: [...new Set(matches.trim().split(/[\s,;]+/).filter(Boolean))],
      heroId: Number(heroId), partnerPlayerId });
  }}>
    <label>Номер{card.kind === "star_race" ? "а матчей" : " матча"}
      <input required value={matches} onChange={(event) => setMatches(event.target.value)}
        inputMode="numeric" placeholder={card.kind === "star_race" ? "Все учтённые матчи через запятую" : "Например, 9037161572"} />
    </label>
    {card.kind === "daily" && <label>Герой в матче
      <select value={heroId} onChange={(event) => setHeroId(event.target.value)} required>
        {card.heroes.map((hero) => <option key={hero.id} value={hero.id}>{hero.name}</option>)}
      </select>
    </label>}
    {card.kind === "clan_outing" && <label>Участник клана в матче
      <select value={partnerPlayerId} onChange={(event) => setPartnerPlayerId(event.target.value)} required>
        <option value="">Выберите участника</option>
        {clanMates.map((mate) => <option key={mate.playerId} value={mate.playerId}>{mate.playerName}</option>)}
      </select>
    </label>}
    <p>Вы вручную подтверждаете выполнение условий задания за выбранную дату.</p>
    <button type="submit" className="compendium-base-manual-complete" disabled={isPending}>
      {isPending ? "Сохраняем…" : "Подтвердить зачёт"}
    </button>
    <button type="button" className="compendium-base-manual-complete" onClick={onCancel} disabled={isPending}>Отмена</button>
  </form>;
}
