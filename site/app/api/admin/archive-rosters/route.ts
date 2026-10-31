import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { isSafeUploadKey } from "@/lib/validation";
import { storeRosterEmblem } from "./roster-emblem";

const roles = [
  "safe_lane",
  "mid_lane",
  "off_lane",
  "soft_support",
  "hard_support",
] as const;

type Role = (typeof roles)[number];
type RosterRole = Role | "coach";
type RosterPlayer = {
  nickname?: string;
  dotaId?: string | null;
  role?: RosterRole;
  tier?: number | null;
  isCaptain?: boolean;
};
type RosterBody = {
  applicationId?: number;
  tournamentId?: number;
  teamName?: string;
  tag?: string;
  selectionMethod?: string;
  teamTierTotal?: number | null;
  contact?: string;
  logoKey?: string;
  players?: RosterPlayer[];
  useProfileTiers?: boolean;
};

function validate(body: RosterBody) {
  const teamName = body.teamName?.trim() ?? "";
  const tag = body.tag?.trim() ?? "";
  const players = body.players ?? [];
  if (!body.tournamentId || !teamName || !tag) {
    return "Укажите турнир, название и тег команды";
  }
  if (teamName.length > 80 || tag.length > 5) {
    return "Название команды — до 80 символов, тег — до 5";
  }
  if (players.length < 5 || players.length > 6) {
    return "В составе должны быть 5 игроков и, при наличии, один тренер";
  }
  if (body.logoKey && !isSafeUploadKey(body.logoKey)) return "Некорректный логотип";
  if (
    players.some(
      (player) =>
        !player.nickname?.trim() || player.nickname.length > 100 ||
        !player.role ||
        (player.role !== "coach" && !roles.includes(player.role)) ||
        (player.dotaId !== null &&
          player.dotaId !== undefined &&
          player.dotaId.trim() !== "" &&
          !/^\d{1,12}$/.test(player.dotaId.trim())) ||
        (player.tier !== null &&
          player.tier !== undefined &&
          (!Number.isInteger(Number(player.tier)) ||
            Number(player.tier) < 0 ||
            Number(player.tier) > 12)),
    )
  ) {
    return "Проверьте никнеймы, роли и исторические тиры игроков";
  }
  const playingPlayers = players.filter((player) => player.role !== "coach");
  if (playingPlayers.length !== 5 || new Set(playingPlayers.map((player) => player.role)).size !== 5) {
    return "Каждая игровая роль должна встречаться один раз";
  }
  if (players.filter((player) => player.role === "coach").length > 1) {
    return "В составе может быть только один тренер";
  }
  if (playingPlayers.filter((player) => player.isCaptain).length !== 1) {
    return "Укажите одного капитана";
  }
  if (players.some((player) => player.role === "coach" && player.isCaptain)) {
    return "Тренер не может быть капитаном игрового состава";
  }
  return "";
}

export async function PUT(request: Request) {
  let storedEmblem: Awaited<ReturnType<typeof storeRosterEmblem>> = null;
  try {
    const admin = await requireAdmin();
    const form = request.headers.get("content-type")?.includes("multipart/form-data")
      ? await request.formData() : null;
    const body = (form ? JSON.parse(String(form.get("roster"))) : await request.json()) as RosterBody;
    const validationError = validate(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    storedEmblem = await storeRosterEmblem(form?.get("emblem") ?? null);
    if (storedEmblem) body.logoKey = storedEmblem.key;

    const players = body.players as Array<
      RosterPlayer & {
        nickname: string;
        role: RosterRole;
        isCaptain: boolean;
      }
    >;
    const captain = players.find((player) => player.isCaptain);
    const applicationId = await transaction(async (client) => {
      const tournament = await client.query<{ team_size: number }>(
        "SELECT team_size::int FROM tournaments WHERE id = $1 FOR UPDATE",
        [body.tournamentId],
      );
      if (!tournament.rowCount) throw new Error("TOURNAMENT_NOT_FOUND");
      if (tournament.rows[0].team_size !== 5) {
        throw new Error("ARCHIVE_TEAM_SIZE");
      }

      let id = Number(body.applicationId) || 0;
      if (id) {
        const updated = await client.query(
          `UPDATE tournament_team_applications SET
             team_name = $1, tag = $2, contact = $3, logo_key = COALESCE($4, logo_key),
             selection_method = $5, captain_name_snapshot = $6,
             team_tier_total_snapshot = $7, status = 'approved',
             updated_at = NOW()
           WHERE id = $8 AND tournament_id = $9
           RETURNING id`,
          [
            body.teamName?.trim(),
            body.tag?.trim(),
            body.contact?.trim() || "Архив",
            body.logoKey?.trim() ?? null,
            body.selectionMethod?.trim() ?? "",
            captain?.nickname.trim(),
            body.teamTierTotal ?? null,
            id,
            body.tournamentId,
          ],
        );
        if (!updated.rowCount) throw new Error("APPLICATION_NOT_FOUND");
      } else {
        const created = await client.query<{ id: number }>(
          `INSERT INTO tournament_team_applications (
             tournament_id, team_name, tag, captain_discord_id, contact,
             logo_key, status, selection_method, captain_name_snapshot,
             team_tier_total_snapshot
           ) VALUES ($1,$2,$3,NULL,$4,$5,'approved',$6,$7,$8)
           RETURNING id::int`,
          [
            body.tournamentId,
            body.teamName?.trim(),
            body.tag?.trim(),
            body.contact?.trim() || "Архив",
            body.logoKey?.trim() || "",
            body.selectionMethod?.trim() ?? "",
            captain?.nickname.trim(),
            body.teamTierTotal ?? null,
          ],
        );
        id = created.rows[0].id;
      }

      await client.query(
        "DELETE FROM tournament_roster_snapshots WHERE application_id = $1",
        [id],
      );
      for (const [index, player] of players.entries()) {
        const dotaId = player.dotaId?.trim() ?? "";
        const matched = await client.query<{ discord_id: string; tier: number | null }>(
          `SELECT discord_id::text, COALESCE(NULLIF(internal_rating, 0), CASE WHEN rank_tier >= 10 THEN rank_tier / 10 WHEN rank_tier > 0 THEN rank_tier END)::int AS tier
           FROM players
           WHERE CASE
             WHEN $2::text <> '' THEN steam_id32::text = $2
             ELSE LOWER(BTRIM(ingame_name)) = LOWER(BTRIM($1))
           END
           ORDER BY discord_id
           LIMIT 1`,
          [player.nickname.trim(), dotaId],
        );
        if ((dotaId || body.useProfileTiers) && !matched.rowCount) {
          throw new Error(`PLAYER_NOT_FOUND:${dotaId}`);
        }
        await client.query(
          `INSERT INTO tournament_roster_snapshots (
             application_id, player_id, nickname_snapshot, role,
             tier_snapshot, is_captain, sort_order
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            id,
            matched.rows[0]?.discord_id ?? null,
            player.nickname.trim(),
            player.role,
            body.useProfileTiers ? matched.rows[0]?.tier ?? null : player.tier ?? null,
            player.isCaptain,
            index + 1,
          ],
        );
      }

      await client.query(
        `INSERT INTO tournament_audit_log (
           tournament_id, actor_discord_id, action, entity_type, entity_id
         ) VALUES ($1,$2,'archive_roster_update','application',$3)`,
        [body.tournamentId, admin.actorDiscordId, String(id)],
      );
      return id;
    });

    storedEmblem = null;
    return Response.json({ ok: true, id: applicationId });
  } catch (error) {
    if (storedEmblem) await storedEmblem.remove();
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Некорректные данные состава" }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("EMBLEM:")) {
      return Response.json({ error: error.message.slice(7) }, { status: 400 });
    }
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return Response.json({ error: "Команда с таким названием или тегом уже есть в турнире" }, { status: 409 });
    }
    if (
      error instanceof Error &&
      (["TOURNAMENT_NOT_FOUND", "APPLICATION_NOT_FOUND", "ARCHIVE_TEAM_SIZE"].includes(
        error.message,
      ) || error.message.startsWith("PLAYER_NOT_FOUND:"))
    ) {
      const messages: Record<string, string> = {
        TOURNAMENT_NOT_FOUND: "Турнир не найден",
        APPLICATION_NOT_FOUND: "Команда не найдена в этом турнире",
        ARCHIVE_TEAM_SIZE: "Редактор составов поддерживает формат 5 × 5",
      };
      const message = error.message.startsWith("PLAYER_NOT_FOUND:")
        ? `Профиль с Dota ID ${error.message.split(":")[1]} не найден`
        : messages[error.message];
      return Response.json({ error: message }, { status: 404 });
    }
    return responseFromAuthError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const applicationId = Number(new URL(request.url).searchParams.get("id"));
    if (!applicationId) {
      return Response.json({ error: "Не указана команда" }, { status: 400 });
    }
    await query("DELETE FROM tournament_team_applications WHERE id = $1", [
      applicationId,
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
