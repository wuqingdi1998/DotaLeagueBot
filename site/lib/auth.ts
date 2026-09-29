import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { one, query } from "@/lib/db";
import { playerServerName } from "@/lib/security";
import {
  addPendingOauthState,
  oauthStateLifetimeMs,
  parsePendingOauthStates,
  takePendingOauthState,
} from "@/lib/oauth-state";
import {
  organizerSessionCookie,
  playerSessionCookie,
  sessionTokenHash,
} from "@/lib/auth-session";
import {
  organizerAccessMethod,
  requiresFreshOrganizerPassword,
  type OrganizerAccessMethod,
} from "@/lib/organizer-access";
import {
  organizerSessionLifetimeHours,
  replaceOrganizerPassword,
  verifyOrganizerPassword,
} from "@/lib/organizer-credentials";
import {
  organizerLoginContext,
  organizerSessionLoginContext,
} from "@/lib/organizer-login-context";
import { participantViewCookie, sessionForParticipantView } from "@/lib/participant-view";

const oauthStateCookie = "ls_oauth_state";
const sessionLifetimeDays = 30;

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
  organizerAccess: OrganizerAccessMethod;
  actorDiscordId?: string | null;
  isStandaloneOrganizer?: boolean;
  hasOrganizerAccess?: boolean;
  isParticipantView?: boolean;
};

export type OrganizerUser = AuthUser & { actorDiscordId: string | null };

export function organizerActorDiscordId(user: AuthUser): string | null {
  if (user.isStandaloneOrganizer) return null;
  return user.actorDiscordId ?? user.discordId;
}

function standaloneOrganizerUser(): AuthUser {
  return {
    discordId: "0",
    dotaId: "0",
    username: "organizer",
    avatarUrl: null,
    playerName: "Организатор",
    realName: null,
    positions: null,
    serverName: "Организатор",
    isAdmin: true,
    organizerAccess: "password",
    actorDiscordId: null,
    isStandaloneOrganizer: true,
    hasOrganizerAccess: true,
    isParticipantView: false,
  };
}

type SessionRow = {
  discord_id: string;
  dota_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  ingame_name: string;
  real_name: string | null;
  positions: string | null;
  is_trusted_organizer: boolean;
  has_password_organizer_session: boolean;
};

export async function createOauthState(returnTo: string): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  const now = Date.now();
  const pending = parsePendingOauthStates(
    cookieStore.get(oauthStateCookie)?.value,
    now,
  );
  const nextPending = addPendingOauthState(pending, {
    state,
    returnTo,
    createdAt: now,
  });
  cookieStore.set(
    oauthStateCookie,
    JSON.stringify(nextPending),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: oauthStateLifetimeMs / 1000,
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
  if (!raw || !receivedState) return null;
  const pending = parsePendingOauthStates(raw);
  const consumed = takePendingOauthState(pending, receivedState);
  if (!consumed.returnTo) {
    if (!pending.length) cookieStore.delete(oauthStateCookie);
    return null;
  }
  if (consumed.remaining.length) {
    cookieStore.set(oauthStateCookie, JSON.stringify(consumed.remaining), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: oauthStateLifetimeMs / 1000,
      path: "/",
    });
  } else {
    cookieStore.delete(oauthStateCookie);
  }
  return consumed.returnTo;
}

export async function createSession(input: {
  discordId: string;
  username: string;
  avatarUrl: string | null;
}): Promise<void> {
  // Password-based access never survives a fresh Discord login. Trusted
  // organizers regain access from the durable Discord allowlist in getSession.
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
      sessionTokenHash(token),
      input.discordId,
      input.username,
      input.avatarUrl,
      expiresAt,
    ],
  );
  const cookieStore = await cookies();
  cookieStore.set(playerSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  cookieStore.delete(participantViewCookie);
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(playerSessionCookie)?.value;
  const organizerToken = cookieStore.get(organizerSessionCookie)?.value;
  if (token) {
    const row = await one<SessionRow>(
      `SELECT
         s.discord_id::text,
         p.steam_id32::text AS dota_id,
         s.discord_username,
         COALESCE(
           NULLIF(p.avatar_url, ''),
           NULLIF(s.discord_avatar_url, '')
         ) AS discord_avatar_url,
         p.ingame_name,
         p.real_name,
         p.positions,
         trusted.discord_id IS NOT NULL AS is_trusted_organizer,
         organizer.token_hash IS NOT NULL AS has_password_organizer_session
       FROM web_sessions s
       JOIN players p ON p.discord_id = s.discord_id
       LEFT JOIN trusted_organizers trusted
         ON trusted.discord_id = s.discord_id
       LEFT JOIN web_organizer_sessions organizer
         ON organizer.token_hash = $2
        AND organizer.discord_id = s.discord_id
        AND organizer.session_kind = 'player'
        AND organizer.role = 'organizer'
        AND organizer.expires_at > NOW()
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
         AND p.is_archived = FALSE`,
      [
        sessionTokenHash(token),
        organizerToken ? sessionTokenHash(organizerToken) : "",
      ],
    );
    if (row) {
      const accessMethod = organizerAccessMethod(
        row.is_trusted_organizer,
        row.has_password_organizer_session,
      );
      return sessionForParticipantView({
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
        isAdmin: accessMethod !== null,
        organizerAccess: accessMethod,
        actorDiscordId: row.discord_id,
      }, cookieStore.get(participantViewCookie)?.value);
    }
  }
  if (!organizerToken) return null;
  const standaloneSession = await one<{ token_hash: string }>(
    `SELECT token_hash
     FROM web_organizer_sessions
     WHERE token_hash = $1
       AND discord_id IS NULL
       AND session_kind = 'standalone'
       AND role = 'organizer'
       AND expires_at > NOW()`,
    [sessionTokenHash(organizerToken)],
  );
  if (!standaloneSession) return null;
  return standaloneOrganizerUser();
}

export async function requireSession(): Promise<AuthUser> {
  const user = await getSession();
  if (!user || user.isStandaloneOrganizer) {
    throw new Response("Требуется вход через Discord", { status: 401 });
  }
  return user;
}

export async function requireAdmin(): Promise<OrganizerUser> {
  const user = await getSession();
  if (!user) {
    throw new Response("Требуется вход организатора", { status: 401 });
  }
  if (!user.isAdmin) {
    throw new Response("Нет прав организатора", { status: 403 });
  }
  return {
    ...user,
    actorDiscordId: organizerActorDiscordId(user),
  };
}

export async function confirmSensitiveOrganizerAction(
  confirmation: { password?: string; confirmed?: boolean },
): Promise<OrganizerUser> {
  const user = await requireAdmin();
  if (requiresFreshOrganizerPassword(user.organizerAccess)) {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get(organizerSessionCookie)?.value ??
      cookieStore.get(playerSessionCookie)?.value ??
      "missing";
    await verifyOrganizerPassword(
      confirmation.password ?? "",
      organizerSessionLoginContext(sessionToken, user.actorDiscordId),
    );
  } else if (confirmation.confirmed !== true) {
    throw new Response("Подтвердите действие", { status: 400 });
  }
  return user;
}

export async function createOrganizerSession(
  suppliedPassword: string,
  request: Request,
): Promise<AuthUser> {
  const currentUser = await getSession();
  if (currentUser?.isStandaloneOrganizer) return currentUser;
  if (currentUser?.isParticipantView) {
    throw new Response("Сначала выключите просмотр от лица участника", { status: 409 });
  }
  if (currentUser?.organizerAccess === "trusted") {
    return { ...currentUser, isAdmin: true, organizerAccess: "trusted" };
  }
  const temporaryPasswordExpiresAt = await verifyOrganizerPassword(
    suppliedPassword,
    organizerLoginContext(request, currentUser?.discordId ?? null),
  );
  if (!currentUser) await deleteSession();
  await query("DELETE FROM web_organizer_sessions WHERE expires_at <= NOW()");
  const token = randomBytes(32).toString("base64url");
  const regularExpiresAt = Date.now() +
    organizerSessionLifetimeHours * 60 * 60 * 1000;
  const expiresAt = new Date(
    temporaryPasswordExpiresAt
      ? Math.min(regularExpiresAt, temporaryPasswordExpiresAt.getTime())
      : regularExpiresAt,
  );
  await query(
    `INSERT INTO web_organizer_sessions
      (token_hash, discord_id, expires_at, session_kind, role)
     VALUES ($1, $2, $3, $4, 'organizer')`,
    [
      sessionTokenHash(token),
      currentUser?.discordId ?? null,
      expiresAt,
      currentUser ? "player" : "standalone",
    ],
  );
  const cookieStore = await cookies();
  cookieStore.set(organizerSessionCookie, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  if (currentUser) {
    return { ...currentUser, isAdmin: true, organizerAccess: "password" };
  }
  return standaloneOrganizerUser();
}

export async function changeOrganizerPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await requireAdmin();
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(organizerSessionCookie)?.value ??
    cookieStore.get(playerSessionCookie)?.value ??
    "missing";
  await replaceOrganizerPassword(
    currentPassword,
    newPassword,
    organizerSessionLoginContext(sessionToken, user.actorDiscordId),
  );
  cookieStore.delete(organizerSessionCookie);
}

export async function deleteOrganizerSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(organizerSessionCookie)?.value;
  if (token) {
    await query(
      "DELETE FROM web_organizer_sessions WHERE token_hash = $1",
      [sessionTokenHash(token)],
    );
  }
  cookieStore.delete(organizerSessionCookie);
}

export async function deleteSession(): Promise<void> {
  await deleteOrganizerSession();
  const cookieStore = await cookies();
  const token = cookieStore.get(playerSessionCookie)?.value;
  if (token) {
    await query("DELETE FROM web_sessions WHERE token_hash = $1", [
      sessionTokenHash(token),
    ]);
  }
  cookieStore.delete(playerSessionCookie);
  cookieStore.delete(participantViewCookie);
}

export function responseFromAuthError(error: unknown): Response {
  if (error instanceof Response) return error;
  throw error;
}
