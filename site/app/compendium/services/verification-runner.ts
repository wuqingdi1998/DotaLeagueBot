import { CompendiumError } from "../model/errors";
import { claimVerification, finishVerificationAttempt } from "./verification-repository";
import { evaluateSavedVerification } from "./saved-verification-evaluation";
import { recordSavedVerification } from "./saved-verification-completion";

export async function runVerificationAttempt(id?: string): Promise<boolean> {
  const claimed = await claimVerification(id);
  if (!claimed) return false;
  const { request, token } = claimed;
  try {
    const evidence = await evaluateSavedVerification(request.snapshot);
    await recordSavedVerification(request, token, evidence);
  } catch (error) {
    const message = error instanceof CompendiumError ? error.message : "Не удалось выполнить проверку. Требуется повторная попытка";
    if (!(error instanceof CompendiumError)) console.error("Saved Compendium verification failed", { requestId: request.id, error });
    await finishVerificationAttempt(request, token, message, id !== undefined);
  }
  return true;
}

export async function processDueVerifications() {
  let checked = 0;
  while (checked < 5 && await runVerificationAttempt()) checked += 1;
  return { checked };
}
