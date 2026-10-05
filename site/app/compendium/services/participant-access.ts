import { requireSession, type AuthUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { requirePlayerParticipation } from "@/lib/player-participation";

export const COMPENDIUM_EXCLUDED_ROLE_NAME = "Массовка";

type ExcludedRoleRow = {
  is_excluded: boolean;
};

export async function isExcludedFromCompendium(
  discordId: string,
): Promise<boolean> {
  const row = await one<ExcludedRoleRow>(
    `SELECT EXISTS (
       SELECT 1
       FROM player_discord_roles role
       WHERE role.player_id = $1
         AND role.role_name = $2
     ) AS is_excluded`,
    [discordId, COMPENDIUM_EXCLUDED_ROLE_NAME],
  );
  return row?.is_excluded === true;
}

export async function requireCompendiumParticipantSession(): Promise<AuthUser> {
  const user = await requireSession();
  await requirePlayerParticipation(user.discordId);
  if (await isExcludedFromCompendium(user.discordId)) {
    throw new Response(
      "Роль «Массовка» не участвует в Компендиуме",
      { status: 403 },
    );
  }
  return user;
}
