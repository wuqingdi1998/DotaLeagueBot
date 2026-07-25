import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { one, query } from "@/lib/db";

const sessionCookie = "ls_session";
const oauthStateCookie = "ls_oauth_state";
const sessionLifetimeDays = 30;

export type AuthUser = {
  discordId: string;
  username: string;
  avatarUrl: string | null;
  playerName: string;
  isAdmin: boolean;
};

type SessionRow = {
  discord_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  ingame_name: string;
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
    if (parsed.state !== receivedState) return null;
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
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const row = await one<SessionRow>(
    `SELECT
       s.discord_id::text,
       s.discord_username,
       s.discord_avatar_url,
       p.ingame_name,
       EXISTS (
         SELECT 1 FROM site_admins a WHERE a.discord_id = s.discord_id
       ) AS is_admin
     FROM web_sessions s
     JOIN players p ON p.discord_id = s.discord_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash(token)],
  );
  if (!row) return null;
  return {
    discordId: row.discord_id,
    username: row.discord_username,
    avatarUrl: row.discord_avatar_url,
    playerName: row.ingame_name,
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

export async function deleteSession(): Promise<void> {
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
