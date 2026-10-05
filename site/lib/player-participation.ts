import { one } from "@/lib/db";
import {
  inactivePlayerParticipationError,
} from "@/lib/player-tier-status";

type PlayerParticipationRow = {
  tier_status: string;
};

export async function requirePlayerParticipation(
  discordId: string,
): Promise<void> {
  const player = await one<PlayerParticipationRow>(
    `SELECT tier_status
     FROM players
     WHERE discord_id = $1 AND is_archived = FALSE`,
    [discordId],
  );
  const error = inactivePlayerParticipationError(player?.tier_status);
  if (error) throw Response.json({ error }, { status: 409 });
}
