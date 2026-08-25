import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { parseMaximumTeamTier } from "@/lib/tournament-registration-tier";
import { setSeasonTournamentRegistrationDeadline } from "@/lib/tournament-settings";
import {
  editableTournamentFields as editableFields,
  missingFieldsMessage,
  missingRequiredTournamentFields,
  normalizeTournamentDateFields,
} from "./tournament-validation";

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) {
      return Response.json({ error: "Не указан турнир" }, { status: 400 });
    }
    const slug = String(body.slug ?? "")
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return Response.json(
        {
          error:
            "Адрес турнира должен состоять из латинских букв, цифр и дефисов",
        },
        { status: 400 },
      );
    }
    const dateError = normalizeTournamentDateFields(body);
    if (dateError) {
      return Response.json({ error: dateError }, { status: 400 });
    }
    setSeasonTournamentRegistrationDeadline(body);
    const values = editableFields.map((field) => body[field]);
    const maximumTeamTier = parseMaximumTeamTier(body.max_team_tier);
    if (maximumTeamTier === undefined) {
      return Response.json(
        {
          error:
            "Максимальный тир должен быть целым числом от 1 до 100 или оставаться пустым",
        },
        { status: 400 },
      );
    }
    const showTiers = body.show_tiers === true;
    const playoffType = String(
      body.playoff_type ?? "double_elimination",
    );
    if (
      !["single_elimination", "double_elimination"].includes(playoffType)
    ) {
      return Response.json(
        { error: "Выберите формат плей-офф Single или Double Elimination" },
        { status: 400 },
      );
    }
    const missingFields = missingRequiredTournamentFields(body);
    if (missingFields.length) {
      return Response.json(
        { error: missingFieldsMessage(missingFields) },
        { status: 400 },
      );
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE tournaments SET
          name = $1, eyebrow = $2, headline = $3, headline_accent = $4,
          description = $5, about = $6, start_at = $7, end_at = $8,
          registration_deadline = $9, status_label = $10, format = $11,
          team_size = $12, max_teams = $13, region = $14, server = $15,
          check_in_minutes = $16, group_format = $17, playoff_format = $18,
          final_format = $19, discord_url = $20, status = $21,
          slug = $22, playoff_type = $23, max_team_tier = $24,
          show_tiers = $25, updated_at = NOW()
        WHERE id = $26`,
        [...values, slug, playoffType, maximumTeamTier, showTiers, id],
      );
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'update', 'tournament', $3)`,
        [id, admin.discordId, String(id)],
      );
    });
    return Response.json({ ok: true, slug });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return Response.json(
        { error: "Турнир с таким адресом уже существует" },
        { status: 409 },
      );
    }
    return responseFromAuthError(error);
  }
}
