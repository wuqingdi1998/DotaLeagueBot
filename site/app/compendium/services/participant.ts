import type { AuthUser } from "@/lib/auth";
import { normalizeDotaAccountId } from "@/lib/player-profile";
import { CompendiumError } from "../model/errors";

export function requireCompendiumDotaId(user: AuthUser): string {
  const dotaId = normalizeDotaAccountId(user.dotaId);
  if (!dotaId) {
    throw new CompendiumError(
      "MISSING_DOTA_ID",
      "Сначала привяжите Dota ID в профиле участника",
    );
  }
  return dotaId;
}
