import { OCTOBER_COMPENDIUM_WEEKS } from "@/app/compendium/model/october-star-race";
import type { OctoberStarRaceWeekDefinition } from "@/app/compendium/model/october-star-race";

export {
  OCTOBER_COMPENDIUM_DATE_LABEL,
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_COMPENDIUM_START_AT,
} from "@/lib/october-compendium-schedule";
export { OCTOBER_COMPENDIUM_WEEKS } from "@/app/compendium/model/october-star-race";

export type OctoberCompendiumWeekDefinition = OctoberStarRaceWeekDefinition;

export function octoberRaceForMoment(now: Date): OctoberCompendiumWeekDefinition {
  const nowMs = now.getTime();
  return OCTOBER_COMPENDIUM_WEEKS.find(
    (week) => nowMs >= Date.parse(week.startsAt) && nowMs < Date.parse(week.endsAt),
  ) ?? OCTOBER_COMPENDIUM_WEEKS.find(
    (week) => nowMs < Date.parse(week.startsAt),
  ) ?? OCTOBER_COMPENDIUM_WEEKS.at(-1)!;
}
