import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { one, query } from "@/lib/db";
import { playerServerName, secretMatches } from "@/lib/security";

const sessionCookie = "ls_session";
const organizerSessionCookie = "ls_organizer_session";
const oauthStateCookie = "ls_oauth_state";
const sessionLifetimeDays = 30;
const organizerSessionLifetimeHours = 12;
const organizerAttemptWindowMinutes = 15;
const organizerAttemptLimit = 5;

export type AuthUser = {
  discordId: string;
  dotaId: string;
  username: string;
  avatarUrl: string | null;
  playerName: string;
  realName: string | null;
  positions: string | null;
  serverName: string;
  isAdmin: boolean;
};

type SessionRow = {
  discord_id: string;
  dota_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  ingame_name: string;
  real_name: string | null;
  positions: string | null;
  is_admin: boolean;
};

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createOauthState(returnTo: string): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(
    oauthStateCookie,
    JSON.stringify({ state, returnTo }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    },
  );
  return state;
}

export async function consumeOauthState(
  receivedState: string | null,
): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(oauthStateCookie)?.value;
  cookieStore.delete(oauthStateCookie);
  if (!raw || !receivedState) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: string; returnTo?: string };
    if (!parsed.state || !secretMatches(parsed.state, receivedState)) return null;
    return parsed.returnTo ?? "/";
  } catch {
    return null;
  }
}

export async function createSession(input: {
  discordId: string;
  username: string;
  avatarUrl: string | null;
}): Promise<void> {
  // Every Discord login starts in ordinary participant mode. Organizer access
  // is always a separate, explicit password step.
  await deleteOrganizerSession();
  await query("DELETE FROM web_sessions WHERE expires_at <= NOW()");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + sessionLifetimeDays * 24 * 60 * 60 * 1000,
  );
  await query(
    `INSERT INTO web_sessions
      (token_hash, discord_id, discord_username, discord_avatar_url, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      tokenHash(token),
      input.discordId,
      input.username,
      input.avatarUrl,
      expiresAt,
    ],
  );
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) return null;
  const organizerToken = cookieStore.get(organizerSessionCookie)?.value;
  const row = await one<SessionRow>(
    `SELECT
       s.discord_id::text,
       p.steam_id32::text AS dota_id,
       s.discord_username,
       s.discord_avatar_url,
       p.ingame_name,
       p.real_name,
       p.positions,
       EXISTS (
         SELECT 1
         FROM web_organizer_sessions organizer
         WHERE organizer.token_hash = $2
           AND organizer.discord_id = s.discord_id
           AND organizer.expires_at > NOW()
       ) AS is_admin
     FROM web_sessions s
     JOIN players p ON p.discord_id = s.discord_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash(token), organizerToken ? tokenHash(organizerToken) : ""],
  );
  if (!row) return null;
  return {
    discordId: row.discord_id,
    dotaId: row.dota_id,
    username: row.discord_username,
    avatarUrl: row.discord_avatar_url,
    playerName: row.ingame_name,
    realName: row.real_name,
    positions: row.positions,
    serverName: playerServerName(
      row.real_name,
      row.ingame_name,
      row.positions,
    ),
    isAdmin: row.is_admin,
  };
}

export async function requireSession(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) {
    throw new Response("Требуется вход через Discord", { status: 401 });
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireSession();
  if (!user.isAdmin) {
    throw new Response("Нет прав организатора", { status: 403 });
  }
  return user;
}

export async function createOrganizerSession(
  suppliedPassword: string,
): Promise<AuthUser> {
  const user = await requireSession();
  const configuredPassword = process.env.ORGANIZER_PASSWORD ?? "";
  if (configuredPassword.length < 12) {
    throw new Response(
      "Пароль организатора ещё не настроен на сервере",
      { status: 503 },
    );
  }

  await query(
    `DELETE FROM web_organizer_login_attempts
     WHERE attempted_at < NOW() - INTERVAL '24 hours'`,
  );
  const recentAttempts = await one<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM web_organizer_login_attempts
     WHERE discord_id = $1
       AND attempted_at > NOW() - ($2::int * INTERVAL '1 minute')`,
    [user.discordId, organizerAttemptWindowMinutes],
  );
  if ((recentAttempts?.count ?? 0) >= organizerAttemptLimit) {
    throw new Response(
      "Слишком много попыток. Повторите вход через 15 минут",
      { status: 429 },
    );
  }

  if (!secretMatches(suppliedPassword, configuredPassword)) {
    await query(
      `INSERT INTO web_organizer_login_attempts(discord_id) VALUES ($1)`,
      [user.discordId],
    );
    throw new Response("Неверный пароль организатора", { status: 401 });
  }

  await query(
    `DELETE FROM web_organizer_login_attempts WHERE discord_id = $1`,
    [user.discordId],
  );
  await query("DELETE FROM web_organizer_sessions WHERE expires_at <= NOW()");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + organizerSessionLifetimeHours * 60 * 60 * 1000,
  );
  await query(
    `INSERT INTO web_organizer_sessions
      (token_hash, discord_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash(token), user.discordId, expiresAt],
  );
  const cookieStore = await cookies();
  cookieStore.set(organizerSessionCookie, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return { ...user, isAdmin: true };
}

export async function deleteOrganizerSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(organizerSessionCookie)?.value;
  if (token) {
    await query(
      "DELETE FROM web_organizer_sessions WHERE token_hash = $1",
      [tokenHash(token)],
    );
  }
  cookieStore.delete(organizerSessionCookie);
}

export async function deleteSession(): Promise<void> {
  await deleteOrganizerSession();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    await query("DELETE FROM web_sessions WHERE token_hash = $1", [
      tokenHash(token),
    ]);
  }
  cookieStore.delete(sessionCookie);
}

export function responseFromAuthError(error: unknown): Response {
  if (error instanceof Response) return error;
  throw error;
}
