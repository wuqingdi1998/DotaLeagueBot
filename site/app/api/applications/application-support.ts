import { query } from "@/lib/db";
import {
  outdatedTierApplicationError,
  type PlayerTierStatus,
} from "@/lib/player-tier-status";

export { outdatedTierApplicationError };

export const allowedTeamImageTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export function hasExpectedImageSignature(
  data: Uint8Array,
  extension: string,
) {
  if (extension === "png") {
    return (
      data.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (value, index) => data[index] === value,
      )
    );
  }
  if (extension === "jpg") {
    return (
      data.length >= 3 &&
      data[0] === 255 &&
      data[1] === 216 &&
      data[2] === 255
    );
  }
  return (
    data.length >= 12 &&
    new TextDecoder().decode(data.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(data.slice(8, 12)) === "WEBP"
  );
}

export type ApplicationPlayerRow = {
  discord_id: string;
  ingame_name: string;
  tier_status: PlayerTierStatus;
};

export async function resolveApplicationPlayer(
  name: string,
): Promise<ApplicationPlayerRow | null> {
  const players = await query<ApplicationPlayerRow>(
     `SELECT discord_id::text, ingame_name, tier_status
     FROM players
     WHERE is_archived = FALSE
       AND LOWER(ingame_name) = LOWER($1)
     ORDER BY discord_id
     LIMIT 2`,
    [name.trim()],
  );
  return players.length === 1 ? players[0] : null;
}
