import { getSession } from "@/lib/auth";
import { one, query } from "@/lib/db";
import {
  customizableSubscriptionRoleNames,
  loadPublicPlayerProfile,
  normalizeDotaAccountId,
  profileBackgroundKeys,
} from "@/lib/player-profile";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dotaId: string }> },
) {
  const { dotaId } = await context.params;
  const profile = await loadPublicPlayerProfile(dotaId);
  if (!profile) {
    return Response.json({ error: "Игрок не найден" }, { status: 404 });
  }
  return Response.json({ profile });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ dotaId: string }> },
) {
  const user = await getSession();
  if (!user) {
    return Response.json({ error: "Требуется вход через Discord" }, { status: 401 });
  }
  const { dotaId: requestedDotaId } = await context.params;
  const dotaId = normalizeDotaAccountId(requestedDotaId);
  if (!dotaId || user.dotaId !== dotaId) {
    return Response.json(
      { error: "Можно менять оформление только своего профиля" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { backgroundKey?: string };
  const backgroundKey = body.backgroundKey?.trim() ?? "";
  if (!profileBackgroundKeys.includes(
    backgroundKey as (typeof profileBackgroundKeys)[number],
  )) {
    return Response.json({ error: "Неизвестный фон профиля" }, { status: 400 });
  }

  const eligibleRole = await one<{ role_name: string }>(
    `SELECT role_name
     FROM player_discord_roles
     WHERE player_id = $1
       AND role_name = ANY($2::text[])
     LIMIT 1`,
    [user.discordId, customizableSubscriptionRoleNames],
  );
  if (!eligibleRole) {
    return Response.json(
      { error: "Изменение фона доступно владельцам цветных рун" },
      { status: 403 },
    );
  }

  await query(
    `INSERT INTO player_profile_preferences (
       player_id, background_key, updated_at
     )
     VALUES ($1, $2, NOW())
     ON CONFLICT (player_id) DO UPDATE
     SET background_key = EXCLUDED.background_key,
         updated_at = NOW()`,
    [user.discordId, backgroundKey],
  );
  return Response.json({ ok: true, backgroundKey });
}
