import { query } from "./db";
import { selectProfileBadgesForDisplay } from "./profile-badges";
import { normalizeDotaAccountId } from "./player-links";

export async function loadPublicPlayerBadges(requestedDotaId: string) {
  const dotaId = normalizeDotaAccountId(requestedDotaId);
  if (!dotaId) return null;
  const rows = await query<{ badge_key: string | null }>(`SELECT badge.badge_key FROM players player
    LEFT JOIN player_identity_members own_member ON own_member.player_id = player.discord_id
    LEFT JOIN player_identity_members related ON related.identity_id = own_member.identity_id
    LEFT JOIN player_profile_badges badge ON badge.player_id = COALESCE(related.player_id, player.discord_id)
    WHERE player.steam_id32 = $1 AND player.is_archived = FALSE
    ORDER BY badge.awarded_at DESC, badge.badge_key`, [dotaId]);
  return rows.length ? selectProfileBadgesForDisplay(rows.flatMap((row) => row.badge_key ? [row.badge_key] : [])) : null;
}
