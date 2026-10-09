import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { assertCompendiumActive } from "../model/lifecycle";
import { currentMoscowDay } from "../model/time";
import { dailyChallengeRewardStars } from "../model/weekend-bonus";
import { starRaceQuestByDate, starRaceQuestBounds, starRaceQuestPhase } from "../model/star-race";
import { runeChallengeWindowStart } from "../model/rune-window";
import type { VerificationKind, VerificationSnapshot } from "../model/verification-retries";
import { requireCompendiumDotaId } from "./participant";
import { ensureDailyQuestSet, loadDailyQuests } from "./repository";
import { loadRuneChallengeStateRecord } from "./rune-challenge-repository";
import { loadClanMateDotaIds } from "./clan-outing-repository";

export async function captureVerificationSnapshot(user: AuthUser, kind: VerificationKind, key?: string, now = new Date()): Promise<VerificationSnapshot> {
  assertCompendiumActive(now);
  const day = currentMoscowDay(now);
  const snapshot: VerificationSnapshot = {
    kind, dateKey: day.dateKey, questId: kind === "daily" ? key! : day.dateKey,
    title: "Клановая вылазка", dotaId: requireCompendiumDotaId(user),
    rewardStars: dailyChallengeRewardStars(day.dateKey), startsAt: day.start.toISOString(),
    endsAt: day.end.toISOString(), heroIds: [], clanMates: [], requirement: null,
  };
  if (kind === "daily") {
    await ensureDailyQuestSet(day.dateKey, user.discordId);
    const quest = (await loadDailyQuests(day.dateKey, user.discordId)).find((quest) => quest.id === key);
    if (!quest) throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
    snapshot.heroIds = quest.heroes.map((hero) => hero.id);
    snapshot.title = "Испытание " + quest.position;
  } else if (kind === "rune") {
    const state = await loadRuneChallengeStateRecord(user.discordId, day.dateKey);
    if (!state.hasAccess) throw new CompendiumError("RUNE_ACCESS_REQUIRED", "Испытание Рун недоступно для вашей текущей роли");
    if (!state.selection) throw new CompendiumError("RUNE_HERO_REQUIRED", "Сначала выберите любимого героя");
    snapshot.title = "Испытание Рун";
    snapshot.heroIds = [state.selection.heroId];
    snapshot.startsAt = runeChallengeWindowStart(day.start, state.selection.selectedAt).toISOString();
  } else if (kind === "clan_outing") {
    snapshot.clanMates = [...(await loadClanMateDotaIds(user.discordId)).entries()]
      .map(([dotaId, mate]) => ({ dotaId, playerId: mate.playerId }));
  } else {
    const quest = starRaceQuestByDate(key!);
    if (!quest?.requirement || quest.rewardStars === null || starRaceQuestPhase(quest, now) !== "active") {
      throw new CompendiumError("STAR_RACE_NOT_ACTIVE", "Задание доступно только в назначенный день по московскому времени.");
    }
    if (quest.requirement.kind === "final-winner-prediction" || quest.requirement.kind === "arcana-equipped-ranked-win") {
      throw new CompendiumError("PREDICTION_INVALID", "Для задания используется отдельная проверка");
    }
    const bounds = starRaceQuestBounds(quest);
    Object.assign(snapshot, { title: `Гонка: ${quest.title}`, dateKey: key!, questId: key!,
      rewardStars: quest.rewardStars, requirement: quest.requirement,
      startsAt: bounds.start.toISOString(), endsAt: bounds.end.toISOString() });
  }
  return snapshot;
}
