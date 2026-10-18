import type { AuthUser } from "@/lib/auth";
import { one, transaction } from "@/lib/db";
import { CompendiumError } from "../model/errors";
import { FINAL_RACE_START_AT, FINAL_RACE_END_AT, finalRaceQuests, isFinalRaceDate, type FinalRacePath } from "../model/final-star-race-definitions";
import { starRaceQuestByDate } from "../model/star-race";

export type FinalRaceSelection = { path: FinalRacePath; selectedOn: string };

export async function loadFinalRaceSelection(playerId: string): Promise<FinalRaceSelection | null> {
  return one<FinalRaceSelection>(`SELECT path, selected_on::text AS "selectedOn"
    FROM october_compendium_final_race_paths WHERE player_id = $1`, [playerId]);
}

/** The stored path is immutable. Late selection unlocks only that date and later dates. */
export async function chooseFinalRacePath(user: AuthUser, path: FinalRacePath, now = new Date()) {
  if (now.getTime() < Date.parse(FINAL_RACE_START_AT) || now.getTime() >= Date.parse(FINAL_RACE_END_AT)) {
    throw new CompendiumError("STAR_RACE_NOT_ACTIVE", "Выбор пути доступен только с 19 по 25 октября по Москве.");
  }
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`compendium-final-race-path:${user.discordId}`]);
    await client.query(`INSERT INTO october_compendium_final_race_paths (player_id, path)
      SELECT $1, $2 WHERE CURRENT_TIMESTAMP >= $3::timestamptz AND CURRENT_TIMESTAMP < $4::timestamptz
      ON CONFLICT (player_id) DO NOTHING`, [user.discordId, path, FINAL_RACE_START_AT, FINAL_RACE_END_AT]);
    const result = await client.query<FinalRaceSelection>(`SELECT path, selected_on::text AS "selectedOn"
      FROM october_compendium_final_race_paths WHERE player_id = $1`, [user.discordId]);
    const selection = result.rows[0];
    if (!selection) throw new CompendiumError("STAR_RACE_NOT_ACTIVE", "Время выбора пути закончилось.");
    if (selection.path !== path) throw new CompendiumError("STAR_RACE_PATH_LOCKED", "Путь уже выбран. Изменить его нельзя.");
    return selection;
  });
}

export async function starRaceQuestForPlayer(playerId: string, dateKey: string) {
  if (!isFinalRaceDate(dateKey)) return starRaceQuestByDate(dateKey);
  const selection = await loadFinalRaceSelection(playerId);
  if (!selection) throw new CompendiumError("STAR_RACE_PATH_REQUIRED", "Сначала выберите Путь Разрушения или Путь Созидания.");
  if (dateKey < selection.selectedOn) throw new CompendiumError("STAR_RACE_NOT_ACTIVE", "Дни до выбора пути не засчитываются.");
  return finalRaceQuests(selection.path).find((quest) => quest.dateKey === dateKey) ?? null;
}
