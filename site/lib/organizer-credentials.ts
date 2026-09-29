import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import {
  createScryptSecretHash,
  scryptSecretHashMatches,
  secretHashMatches,
  secretMatches,
} from "@/lib/security";
import type { OrganizerLoginContext } from "@/lib/organizer-login-context";

export const organizerPasswordMinimumLength = 12;
export const organizerSessionLifetimeHours = 2;
const organizerAttemptWindowMinutes = 15;
const organizerAttemptLimit = 5;

type TemporaryOrganizerPasswordRow = {
  password_hash: string;
  expires_at: Date;
};

type PermanentOrganizerPasswordRow = {
  password_hash: string;
};

type PasswordVerificationResult =
  | { status: "accepted"; temporaryPasswordExpiresAt: Date | null }
  | { status: "limited" }
  | { status: "not-configured" }
  | { status: "rejected" };

async function storedPasswords(client: PoolClient) {
  const temporaryPasswords = await client.query<TemporaryOrganizerPasswordRow>(
    `SELECT password_hash, expires_at
     FROM temporary_organizer_passwords
     WHERE expires_at > NOW()
     ORDER BY expires_at`,
  );
  const permanentPasswords = await client.query<PermanentOrganizerPasswordRow>(
    `SELECT password_hash
     FROM organizer_passwords
     WHERE is_active = TRUE
     ORDER BY id`,
  );
  return {
    temporaryPasswords: temporaryPasswords.rows,
    permanentPasswords: permanentPasswords.rows,
  };
}

async function verifyWithinRateLimit(
  suppliedPassword: string,
  context: OrganizerLoginContext,
): Promise<PasswordVerificationResult> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      context.attemptKey,
    ]);
    await client.query(
      `DELETE FROM web_organizer_login_attempts
       WHERE attempted_at < NOW() - INTERVAL '30 days'`,
    );
    const recentAttempts = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM web_organizer_login_attempts
       WHERE attempt_key = $1
         AND attempted_at > NOW() - ($2::int * INTERVAL '1 minute')`,
      [context.attemptKey, organizerAttemptWindowMinutes],
    );
    if ((recentAttempts.rows[0]?.count ?? 0) >= organizerAttemptLimit) {
      return { status: "limited" };
    }

    const { temporaryPasswords, permanentPasswords } = await storedPasswords(client);
    const configuredPassword = process.env.ORGANIZER_PASSWORD ?? "";
    const temporaryPassword = temporaryPasswords.find((password) =>
      secretHashMatches(suppliedPassword, password.password_hash),
    );
    const isStoredPermanentPassword = permanentPasswords.some((password) =>
      scryptSecretHashMatches(suppliedPassword, password.password_hash),
    );
    const isBootstrapPassword =
      permanentPasswords.length === 0 &&
      configuredPassword.length >= organizerPasswordMinimumLength &&
      secretMatches(suppliedPassword, configuredPassword);
    if (temporaryPassword || isStoredPermanentPassword || isBootstrapPassword) {
      return {
        status: "accepted",
        temporaryPasswordExpiresAt: temporaryPassword?.expires_at ?? null,
      };
    }
    if (
      configuredPassword.length < organizerPasswordMinimumLength &&
      permanentPasswords.length === 0 &&
      temporaryPasswords.length === 0
    ) {
      return { status: "not-configured" };
    }
    await client.query(
      `INSERT INTO web_organizer_login_attempts
         (discord_id, attempt_key, failure_reason, user_agent)
       VALUES ($1, $2, 'invalid_password', $3)`,
      [context.discordId, context.attemptKey, context.userAgent],
    );
    return { status: "rejected" };
  });
}

export async function verifyOrganizerPassword(
  suppliedPassword: string,
  context: OrganizerLoginContext,
): Promise<Date | null> {
  const result = await verifyWithinRateLimit(suppliedPassword, context);
  if (result.status === "accepted") return result.temporaryPasswordExpiresAt;
  if (result.status === "limited") {
    throw new Response(
      "Слишком много попыток. Повторите вход через 15 минут",
      { status: 429 },
    );
  }
  if (result.status === "not-configured") {
    throw new Response(
      "Пароль организатора ещё не настроен на сервере",
      { status: 503 },
    );
  }
  throw new Response("Неверный пароль организатора", { status: 401 });
}

export async function replaceOrganizerPassword(
  currentPassword: string,
  newPassword: string,
  context: OrganizerLoginContext,
): Promise<void> {
  if (newPassword.length < organizerPasswordMinimumLength) {
    throw new Response(
      `Новый пароль должен содержать не менее ${organizerPasswordMinimumLength} символов`,
      { status: 400 },
    );
  }
  await verifyOrganizerPassword(currentPassword, context);
  const passwordHash = createScryptSecretHash(newPassword);
  await transaction(async (client) => {
    await client.query("UPDATE organizer_passwords SET is_active = FALSE WHERE is_active");
    await client.query(
      "INSERT INTO organizer_passwords(password_hash) VALUES ($1)",
      [passwordHash],
    );
    await client.query("DELETE FROM web_organizer_sessions WHERE role = 'organizer'");
  });
}
