import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { defaultSeasonFacts } from "@/lib/season-facts";

type SourceTournament = {
  id: number;
  slug: string;
  tournament_type: "ordinary" | "seasonal" | "seasonal_cup";
  season_round_count: number;
};

function copySlug(baseSlug: string, copyNumber: number) {
  const suffix = copyNumber === 1 ? "-copy" : `-copy-${copyNumber}`;
  return `${baseSlug.slice(0, 80 - suffix.length)}${suffix}`;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { tournamentId?: unknown };
    const tournamentId = Number(body.tournamentId);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return Response.json({ error: "Некорректный турнир" }, { status: 400 });
    }

    const clone = await transaction(async (client) => {
      const sourceResult = await client.query<SourceTournament>(
        `SELECT id::int, slug, tournament_type,
           season_round_count::int
         FROM tournaments
         WHERE id = $1`,
        [tournamentId],
      );
      const source = sourceResult.rows[0];
      if (!source) return null;

      let slug = copySlug(source.slug, 1);
      for (let copyNumber = 2; ; copyNumber += 1) {
        const occupied = await client.query(
          "SELECT 1 FROM tournaments WHERE slug = $1",
          [slug],
        );
        if (!occupied.rowCount) break;
        slug = copySlug(source.slug, copyNumber);
      }

      const createdResult = await client.query<{
        id: number;
        name: string;
      }>(
        `INSERT INTO tournaments (
           slug, name, eyebrow, headline, headline_accent, description,
           about, start_at, end_at, registration_deadline, status_label,
           format, team_size, max_teams, region, server, check_in_minutes,
           group_format, playoff_format, final_format, discord_url, status,
           playoff_type, tournament_type, season_round_count,
           max_team_tier, show_tiers
         )
         SELECT
           $2, LEFT(name, 140) || ' — копия', eyebrow, headline,
           headline_accent, description, about, start_at, end_at,
           registration_deadline, status_label, format, team_size,
           max_teams, region, server, check_in_minutes, group_format,
           playoff_format, final_format, discord_url, 'draft',
           playoff_type, tournament_type, season_round_count,
           max_team_tier, show_tiers
         FROM tournaments
         WHERE id = $1
         RETURNING id::int, name`,
        [source.id, slug],
      );
      const created = createdResult.rows[0];

      await client.query(
        `INSERT INTO tournament_organizers(tournament_id, discord_id)
         VALUES ($1, $2)`,
        [created.id, admin.discordId],
      );
      await client.query(
        `INSERT INTO tournament_rules (tournament_id, sort_order, rule_text)
         SELECT $2, sort_order, rule_text
         FROM tournament_rules
         WHERE tournament_id = $1`,
        [source.id, created.id],
      );
      await client.query(
        `INSERT INTO tournament_prizes (
           tournament_id, placement, prize_text
         )
         SELECT $2, placement, prize_text
         FROM tournament_prizes
         WHERE tournament_id = $1`,
        [source.id, created.id],
      );
      await client.query(
        `INSERT INTO tournament_schedule_days (
           tournament_id, day_date, title, sort_order
         )
         SELECT $2, day_date, title, sort_order
         FROM tournament_schedule_days
         WHERE tournament_id = $1`,
        [source.id, created.id],
      );
      await client.query(
        `INSERT INTO tournament_schedule_entries (
           day_id, start_time, stage_name, match_count,
           series_format, sort_order
         )
         SELECT cloned_day.id, entry.start_time, entry.stage_name,
           entry.match_count, entry.series_format, entry.sort_order
         FROM tournament_schedule_entries entry
         JOIN tournament_schedule_days source_day
           ON source_day.id = entry.day_id
         JOIN tournament_schedule_days cloned_day
           ON cloned_day.tournament_id = $2
          AND cloned_day.sort_order = source_day.sort_order
         WHERE source_day.tournament_id = $1`,
        [source.id, created.id],
      );

      if (source.tournament_type === "seasonal") {
        await client.query(
          `INSERT INTO season_rounds (
             tournament_id, round_number, round_kind
           )
           SELECT $1, number, 'regular'
           FROM generate_series(1, $2::int) AS number`,
          [created.id, source.season_round_count],
        );
        await client.query(
          `INSERT INTO season_rounds (
             tournament_id, round_number, name, round_kind
           )
           VALUES ($1, $2::int + 1, 'Финалы', 'finals')`,
          [created.id, source.season_round_count],
        );
        for (const [index, fact] of defaultSeasonFacts(
          source.season_round_count,
          0,
        ).entries()) {
          await client.query(
            `INSERT INTO tournament_season_facts (
               tournament_id, sort_order, value_text, label
             ) VALUES ($1, $2, $3, $4)`,
            [created.id, index + 1, fact.value, fact.label],
          );
        }
      }

      await client.query(
        `INSERT INTO tournament_audit_log (
           tournament_id, actor_discord_id, action, entity_type, entity_id,
           details
         ) VALUES ($1, $2, 'clone', 'tournament', $3, $4::jsonb)`,
        [
          created.id,
          admin.discordId,
          String(created.id),
          JSON.stringify({ sourceTournamentId: source.id }),
        ],
      );
      return { id: created.id, slug, name: created.name };
    });

    if (!clone) {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    return Response.json({ ok: true, ...clone }, { status: 201 });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
