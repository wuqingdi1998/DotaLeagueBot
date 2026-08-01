import {
  DAILY_HERO_COUNT,
  DAILY_QUEST_COUNT,
  HEROES_PER_QUEST,
} from "./constants";
import { COMPENDIUM_HEROES } from "./heroes";
import type { CompendiumHero } from "./types";

function shuffledHeroes(
  heroes: CompendiumHero[],
  random: () => number,
): CompendiumHero[] {
  const shuffled = [...heroes];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function generateDailyQuestHeroes(
  heroes: CompendiumHero[] = COMPENDIUM_HEROES,
  random: () => number = Math.random,
): CompendiumHero[][] {
  if (heroes.length < DAILY_HERO_COUNT) {
    throw new Error("Недостаточно героев для дневных заданий");
  }
  const shuffled = shuffledHeroes(heroes, random);
  return Array.from({ length: DAILY_QUEST_COUNT }, (_, questIndex) =>
    shuffled
      .slice(
        questIndex * HEROES_PER_QUEST,
        (questIndex + 1) * HEROES_PER_QUEST,
      )
      .sort((left, right) => left.name.localeCompare(right.name, "en")),
  );
}

export function generateRerollQuestHeroes(
  excludedHeroIds: Iterable<number>,
  heroes: CompendiumHero[] = COMPENDIUM_HEROES,
  random: () => number = Math.random,
): CompendiumHero[] {
  const excluded = new Set(excludedHeroIds);
  const availableHeroes = heroes.filter((hero) => !excluded.has(hero.id));
  if (availableHeroes.length < HEROES_PER_QUEST) {
    throw new Error("Недостаточно новых героев для реролла задания");
  }
  return shuffledHeroes(availableHeroes, random)
    .slice(0, HEROES_PER_QUEST)
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}
