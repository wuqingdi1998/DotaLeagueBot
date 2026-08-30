import { one, query } from "@/lib/db";
import {
  SEASON_RANKED_WIN_BUTTON_TTL_MS,
  type DotaPosition,
  type RankedWinSnapshot,
} from "./model";
import { calculateSeasonRankedWins, SeasonRankedWinsError } from "./service";

type PlayerWinTarget = {
  player_id: string;
  dota_id: string;
  positions: string | null;
};

type RankedWinCheckRow = {
  primary_role: number;
  secondary_role: number;
  primary_wins: number;
  secondary_wins: number;
  checked_at: Date;
};

const pendingPlayerRefreshes = new Map<string, Promise<RankedWinSnapshot>>();

function snapshotFromRow(row: RankedWinCheckRow): RankedWinSnapshot {
  return {
    primaryRole: row.primary_role as DotaPosition,
    secondaryRole: row.secondary_role as DotaPosition,
    primaryWins: row.primary_wins,
    secondaryWins: row.secondary_wins,
    checkedAt: row.checked_at.toISOString(),
    availableUntil: new Date(
      row.checked_at.getTime() + SEASON_RANKED_WIN_BUTTON_TTL_MS,
    ).toISOString(),
  };
}

async function playerWinTarget(playerId: string): Promise<PlayerWinTarget> {
  const target = await one<PlayerWinTarget>(
    `SELECT player.discord_id::text AS player_id,
       COALESCE(current_player.steam_id32, player.steam_id32)::text AS dota_id,
       COALESCE(NULLIF(current_player.positions, ''), player.positions)
         AS positions
     FROM players player
     LEFT JOIN player_identity_members identity_member
       ON identity_member.player_id = player.discord_id
     LEFT JOIN player_identities identity
       ON identity.id = identity_member.identity_id
     LEFT JOIN players current_player
       ON current_player.discord_id = identity.registered_player_id
      AND current_player.is_archived = FALSE
     WHERE player.discord_id = $1 AND player.is_archived = FALSE`,
    [playerId],
  );
  if (!target) {
    throw new SeasonRankedWinsError("Профиль игрока не найден");
  }
  return target;
}

async function savePlayerRankedWins(
  playerId: string,
  snapshot: RankedWinSnapshot,
): Promise<void> {
  await query(
    `INSERT INTO season_ranked_win_checks
       (player_id, primary_role, secondary_role, primary_wins,
        secondary_wins, checked_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (player_id) DO UPDATE
     SET primary_role = EXCLUDED.primary_role,
         secondary_role = EXCLUDED.secondary_role,
         primary_wins = EXCLUDED.primary_wins,
         secondary_wins = EXCLUDED.secondary_wins,
         checked_at = EXCLUDED.checked_at`,
    [
      playerId,
      snapshot.primaryRole,
      snapshot.secondaryRole,
      snapshot.primaryWins,
      snapshot.secondaryWins,
      snapshot.checkedAt,
    ],
  );
}

async function performPlayerRefresh(playerId: string): Promise<RankedWinSnapshot> {
  const target = await playerWinTarget(playerId);
  const snapshot = await calculateSeasonRankedWins({
    dotaId: target.dota_id,
    positions: target.positions,
  });
  await savePlayerRankedWins(playerId, snapshot);
  return snapshot;
}

export async function refreshPlayerRankedWins(
  playerId: string,
): Promise<RankedWinSnapshot> {
  const pending = pendingPlayerRefreshes.get(playerId);
  if (pending) return pending;
  const refresh = performPlayerRefresh(playerId).finally(() => {
    pendingPlayerRefreshes.delete(playerId);
  });
  pendingPlayerRefreshes.set(playerId, refresh);
  return refresh;
}

export async function refreshRoundRegistrationRankedWins(
  roundId: number,
  playerId: string,
): Promise<RankedWinSnapshot | null> {
  const registration = await one<{ is_registered: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM season_round_registrations
       WHERE round_id = $1 AND player_id = $2
     ) AS is_registered`,
    [roundId, playerId],
  );
  if (!registration?.is_registered) return null;
  return refreshPlayerRankedWins(playerId);
}

export async function freshPlayerRankedWins(
  playerId: string,
): Promise<RankedWinSnapshot | null> {
  const row = await one<RankedWinCheckRow>(
    `SELECT primary_role::int, secondary_role::int,
       primary_wins::int, secondary_wins::int, checked_at
     FROM season_ranked_win_checks
     WHERE player_id = $1
       AND checked_at > NOW() - INTERVAL '5 minutes'`,
    [playerId],
  );
  return row ? snapshotFromRow(row) : null;
}

async function refreshTargetBatch(targets: PlayerWinTarget[]): Promise<number> {
  let refreshed = 0;
  for (const target of targets) {
    try {
      await refreshPlayerRankedWins(target.player_id);
      refreshed += 1;
    } catch (error) {
      console.error("Season ranked wins refresh failed", {
        playerId: target.player_id,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return refreshed;
}

export async function refreshRegisteredSeasonRankedWins(): Promise<{
  checked: number;
  refreshed: number;
}> {
  const targets = await query<PlayerWinTarget>(
    `SELECT DISTINCT ON (registration.player_id)
       registration.player_id::text,
       COALESCE(current_player.steam_id32, player.steam_id32)::text AS dota_id,
       COALESCE(NULLIF(current_player.positions, ''), player.positions)
         AS positions
     FROM season_round_registrations registration
     JOIN season_rounds round ON round.id = registration.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     JOIN players player ON player.discord_id = registration.player_id
     LEFT JOIN player_identity_members identity_member
       ON identity_member.player_id = registration.player_id
     LEFT JOIN player_identities identity
       ON identity.id = identity_member.identity_id
     LEFT JOIN players current_player
       ON current_player.discord_id = identity.registered_player_id
      AND current_player.is_archived = FALSE
     WHERE tournament.tournament_type = 'seasonal'
       AND tournament.status IN ('registration', 'active')
       AND season_round_status_at(round.scheduled_at, round.status)
         IN ('planned', 'active')
       AND round.is_visible = TRUE
     ORDER BY registration.player_id, round.scheduled_at DESC NULLS LAST`,
  );
  const batches = [targets.filter((_, index) => index % 2 === 0), targets.filter((_, index) => index % 2 === 1)];
  const refreshed = (
    await Promise.all(batches.map((batch) => refreshTargetBatch(batch)))
  ).reduce((sum, count) => sum + count, 0);
  return { checked: targets.length, refreshed };
}
