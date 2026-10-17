import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import { starRaceQuestBounds, type StarRaceData, type StarRaceQuest, type StarRaceQuestRequirement } from "../model/star-race";

export const FINAL_RACE_PREVIEW_WEEK = OCTOBER_COMPENDIUM_WEEKS[2];

type PreviewChallenge = { title: string; description: string; requirement?: StarRaceQuestRequirement };

const coreChallenges: readonly PreviewChallenge[] = [
  { title: "Десятка", description: "10 убийств за один матч." },
  { title: "До трона", description: "25 000 урона строениям за день.", requirement: { kind: "winning-building-damage", targetDamage: 25_000 } },
  { title: "Угроза", description: "30 000 урона героям за один матч." },
  { title: "Богатство", description: "650 золота в минуту за один матч." },
  { title: "Натиск", description: "45 000 урона героям за день." },
  { title: "Точный удар", description: "12 убийств за один матч." },
  { title: "Штурм", description: "30 000 урона строениям за день." },
];

const supportChallenges: readonly PreviewChallenge[] = [
  { title: "Помощь", description: "8 000 лечения союзников за день." },
  { title: "Команда", description: "20 содействий за один матч." },
  { title: "Живи!", description: "6 000 лечения союзников за один матч." },
  { title: "Рядом", description: "35 содействий за день." },
  { title: "Забота", description: "12 000 лечения союзников за день." },
  { title: "Связь", description: "25 содействий за один матч." },
  { title: "Спасение", description: "15 000 лечения союзников за день." },
];

/** Private design sample. These conditions never enter live verification or rewards. */
export function finalRacePreviewData(activeDay: number, isCompleted = false, completedPath: "core" | "support" = "core") {
  function questsFor(challenges: readonly PreviewChallenge[], path: "core" | "support"): StarRaceQuest[] {
    return FINAL_RACE_PREVIEW_WEEK.quests.map((definition, index) => {
      const bounds = starRaceQuestBounds(definition);
      const isQuestCompleted = path === completedPath && (index < activeDay || (index === activeDay && isCompleted));
      const requirement = challenges[index].requirement ?? null;
      return {
        ...definition, ...challenges[index], requirement,
        weekday: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index],
        startsAt: bounds.start.toISOString(), endsAt: bounds.end.toISOString(),
        phase: index === activeDay ? "active" : index < activeDay ? "finished" : "upcoming",
        heroes: [], progress: requirement?.kind === "winning-building-damage"
          ? { current: isQuestCompleted ? requirement.targetDamage : 12_500, target: requirement.targetDamage, checkedAt: null } : null,
        heroProgress: null, pendingVerification: null, finalPrediction: null,
        completion: isQuestCompleted
          ? { completedAt: bounds.start.toISOString(), wins: [], isManual: false } : null,
      };
    });
  }
  const lanes = [
    { title: "Путь кора · урон и натиск", quests: questsFor(coreChallenges, "core") },
    { title: "Путь поддержки · лечение и помощь", quests: questsFor(supportChallenges, "support") },
  ];
  const race: StarRaceData = {
    ...FINAL_RACE_PREVIEW_WEEK, phase: "active", isDetailsVisible: true,
    personalStars: null, personalRank: null, quests: lanes.flatMap((lane) => lane.quests),
  };
  return { race, lanes, currentTimeMs: Date.parse(lanes[0].quests[activeDay].startsAt) + 12 * 60 * 60 * 1000 };
}
