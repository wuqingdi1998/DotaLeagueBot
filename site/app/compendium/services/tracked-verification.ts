import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import type { VerificationKind } from "../model/verification-retries";
import { captureVerificationSnapshot } from "./verification-snapshot";
import { enqueueVerification } from "./verification-repository";

/** Only valid participant requests enter the queue; repeated failures preserve the original clock and conditions. */
export async function trackCompendiumVerification<T>(user: AuthUser, kind: VerificationKind, key: string | undefined, check: () => Promise<T>): Promise<T> {
  const snapshot = await captureVerificationSnapshot(user, kind, key);
  try {
    const result = await check();
    if (kind === "star_race" && result && typeof result === "object" && "completion" in result && result.completion === null) {
      await enqueueVerification(user.discordId, snapshot, "Полный результат задания пока не подтверждён");
    }
    return result;
  } catch (error) {
    if (error instanceof CompendiumError && ["OPEN_DOTA_UNAVAILABLE", "NO_MATCH", "STALE_QUEST", "STAR_RACE_NOT_ACTIVE", "COMPENDIUM_FINISHED"].includes(error.code)) {
      const request = await enqueueVerification(user.discordId, snapshot, error.message);
      if (request?.status === "pending") {
        throw new CompendiumError(error.code, `${error.message}. Запрос сохранён: проверяем автоматически в течение двух часов. Повторное нажатие не перезапускает ожидание.`);
      }
    }
    throw error;
  }
}
