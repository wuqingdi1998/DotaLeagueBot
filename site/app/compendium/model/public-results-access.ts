import { areOctoberResultsArchived } from "@/lib/october-compendium-schedule";
import { COMPENDIUM_ARCHIVES } from "./archive";

export function archivedCompendiumDestination(isOrganizer: boolean, now: Date = new Date()): string | null {
  if (!areOctoberResultsArchived(now)) return null;
  return isOrganizer ? COMPENDIUM_ARCHIVES.october.resultsHref : "/";
}
