import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { validSeasonRoundCount } from "@/lib/season";
import {
  editableTournamentFields,
  missingFieldsMessage,
  missingRequiredTournamentFields,
} from "./tournament-validation";

function tournamentSlug(body: Record<string, unknown>) {
  return String(body.slug ?? "").trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const slug = tournamentSlug(body);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return Response.json(
        { error: "Адрес турнира должен состоять из латинских букв, цифр и дефисов" },
        { status: 400 },
      );
    }

    const tournamentType = String(body.tournament_type ?? "ordinary");
    if (!["ordinary", "seasonal"].includes(tournamentType)) {
      return Response.json(
        { error: "Выберите обычный или сезонный турнир" },
        { status: 400 },
      );
    }
    const seasonRoundCount =
      tournamentType === "seasonal" ? Number(body.season_round_count) : 0;
    if (
      tournamentType === "seasonal" &&
      !validSeasonRoundCount(seasonRoundCount)
    ) {
      return Response.json(
        { error: "Количество туров должно быть от 1 до 100" },
        { status: 400 },
      );
    }

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

    const values = editableTournamentFields.map((field) => body[field]);
    const created = await transaction(async (client) => {
      const result = await client.query<{ id: number }>(
        `INSERT INTO tournaments (
          slug, name, eyebrow, headline, headline_accent, description, about,
          start_at, end_at, registration_deadline, status_label, format,
          team_size, max_teams, region, server, check_in_minutes,
          group_format, playoff_format, final_format, discord_url, status,
          playoff_type, tournament_type, season_round_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
          $24, $25
        ) RETURNING id::int`,
        [slug, ...values, playoffType, tournamentType, seasonRoundCount],
      );
      const id = result.rows[0].id;
      await client.query(
        `INSERT INTO tournament_organizers(tournament_id, discord_id)
         VALUES ($1, $2)`,
        [id, admin.discordId],
      );
      if (tournamentType === "seasonal") {
        await client.query(
          `INSERT INTO season_rounds (tournament_id, round_number)
           SELECT $1, number
           FROM generate_series(1, $2::int) AS number`,
          [id, seasonRoundCount],
        );
      }
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'create', 'tournament', $3)`,
        [id, admin.discordId, String(id)],
      );
      return id;
    });
    return Response.json({ ok: true, id: created }, { status: 201 });
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
