import "server-only";

import { one, query } from "@/lib/db";
import { sessionTokenHash } from "@/lib/auth-session";
import { publishSiteBreakEvent } from "@/lib/site-break-events";

type SiteBreakRow = {
  is_break_enabled: boolean;
};

export async function isSiteBreakEnabled(): Promise<boolean> {
  const state = await one<SiteBreakRow>(
    "SELECT is_break_enabled FROM site_runtime_settings WHERE id = 1",
  );
  return state?.is_break_enabled ?? false;
}

export async function setSiteBreakEnabled(
  isBreakEnabled: boolean,
  organizerId: string,
): Promise<boolean> {
  const rows = await query<SiteBreakRow>(
    `INSERT INTO site_runtime_settings
       (id, is_break_enabled, updated_at, updated_by)
     VALUES (1, $1, NOW(), $2)
     ON CONFLICT (id) DO UPDATE
     SET is_break_enabled = EXCLUDED.is_break_enabled,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by
     RETURNING is_break_enabled`,
    [isBreakEnabled, organizerId],
  );
  const nextState = rows[0].is_break_enabled;
  publishSiteBreakEvent({ isBreakEnabled: nextState });
  return nextState;
}

export async function hasOrganizerSession(input: {
  playerSessionToken: string | null;
  organizerSessionToken: string | null;
}): Promise<boolean> {
  if (!input.playerSessionToken || !input.organizerSessionToken) return false;
  const result = await one<{ is_organizer: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM web_sessions participant_session
       JOIN web_organizer_sessions organizer_session
         ON organizer_session.discord_id = participant_session.discord_id
       JOIN players player
         ON player.discord_id = participant_session.discord_id
       WHERE participant_session.token_hash = $1
         AND participant_session.expires_at > NOW()
         AND organizer_session.token_hash = $2
         AND organizer_session.expires_at > NOW()
         AND player.is_archived = FALSE
     ) AS is_organizer`,
    [
      sessionTokenHash(input.playerSessionToken),
      sessionTokenHash(input.organizerSessionToken),
    ],
  );
  return result?.is_organizer ?? false;
}
