import { OCTOBER_COMPENDIUM_START_AT, OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";

/** Keep archived TI choices separate from the October player's own first choice. */
export function runeChallengeTablesForDate(dateKey: string) {
  const isOctober = dateKey >= OCTOBER_COMPENDIUM_START_AT.slice(0, 10)
    && dateKey < OCTOBER_COMPENDIUM_END_AT.slice(0, 10);
  return isOctober
    ? {
        selections: "october_compendium_rune_challenge_selections",
        completions: "october_compendium_rune_challenge_completions",
      }
    : {
        selections: "compendium_rune_challenge_selections",
        completions: "compendium_rune_challenge_completions",
      };
}
