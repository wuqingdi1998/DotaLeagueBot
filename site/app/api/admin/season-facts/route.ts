import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import {
  normalizeSeasonFacts,
  seasonFactsValidationError,
  type SeasonFactInput,
} from "@/lib/season-facts";

type SeasonFactsBody = {
  tournamentId?: number;
  facts?: SeasonFactInput[];
};

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as SeasonFactsBody;
    const tournamentId = Number(body.tournamentId);
    if (!tournamentId) {
      return Response.json({ error: "Не указан турнир" }, { status: 400 });
    }

    const facts = normalizeSeasonFacts(body.facts ?? []);
    const validationError = seasonFactsValidationError(facts);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    await transaction(async (client) => {
      const tournament = await client.query<{ tournament_type: string }>(
        `SELECT tournament_type
         FROM tournaments
         WHERE id = $1
         FOR UPDATE`,
        [tournamentId],
      );
      if (!tournament.rowCount) throw new Error("TOURNAMENT_NOT_FOUND");
      if (tournament.rows[0].tournament_type !== "seasonal") {
        throw new Error("TOURNAMENT_NOT_SEASONAL");
      }

      await client.query(
        "DELETE FROM tournament_season_facts WHERE tournament_id = $1",
        [tournamentId],
      );
      for (const [index, fact] of facts.entries()) {
        await client.query(
          `INSERT INTO tournament_season_facts (
             tournament_id, sort_order, value_text, label
           )
           VALUES ($1, $2, $3, $4)`,
          [tournamentId, index + 1, fact.value, fact.label],
        );
      }
      await client.query(
        "UPDATE tournaments SET updated_at = NOW() WHERE id = $1",
        [tournamentId],
      );
      await client.query(
        `INSERT INTO tournament_audit_log (
           tournament_id, actor_discord_id, action, entity_type, details
         )
         VALUES ($1, $2, 'season_facts_update', 'tournament', $3::jsonb)`,
        [
          tournamentId,
          admin.discordId,
          JSON.stringify({ factCount: facts.length }),
        ],
      );
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    if (
      error instanceof Error &&
      error.message === "TOURNAMENT_NOT_SEASONAL"
    ) {
      return Response.json(
        { error: "Информационная полоска доступна только сезонным турнирам" },
        { status: 400 },
      );
    }
    return responseFromAuthError(error);
  }
}
