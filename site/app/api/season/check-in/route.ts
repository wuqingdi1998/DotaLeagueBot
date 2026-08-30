import { requireSession, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import type { TournamentStatus } from "@/lib/tournaments";
import { seasonRoundCheckInIsOpen } from "@/lib/season-round-registration";

type CheckInTarget = {
  scheduled_at: Date | null;
  round_kind: "regular" | "finals";
  round_status: "planned" | "active" | "completed" | "cancelled";
  tournament_status: TournamentStatus;
  is_visible: boolean;
  is_registered: boolean;
};

function checkInRoundId(value: unknown): number {
  const roundId = Number(value);
  if (!Number.isInteger(roundId) || roundId <= 0) {
    throw new Response("Некорректный тур", { status: 400 });
  }
  return roundId;
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;
    const roundId = checkInRoundId(body.roundId);

    return await transaction(async (client) => {
      const result = await client.query<CheckInTarget>(
        `SELECT round.scheduled_at, round.round_kind,
           season_round_status_at(round.scheduled_at, round.status)
             AS round_status,
           tournament.status AS tournament_status, round.is_visible,
           EXISTS (
             SELECT 1 FROM season_round_registrations registration
             WHERE registration.round_id = round.id
               AND registration.player_id = $2
           ) AS is_registered
         FROM season_rounds round
         JOIN tournaments tournament ON tournament.id = round.tournament_id
         WHERE round.id = $1 AND tournament.tournament_type = 'seasonal'
         FOR UPDATE OF round`,
        [roundId, user.discordId],
      );
      const target = result.rows[0];
      if (!target) {
        throw new Response("Тур не найден", { status: 404 });
      }
      if (!target.is_registered) {
        throw new Response("Сначала зарегистрируйтесь на этот тур", {
          status: 403,
        });
      }
      if (
        !target.is_visible ||
        !seasonRoundCheckInIsOpen({
          scheduledAt: target.scheduled_at,
          now: new Date(),
          roundKind: target.round_kind,
          roundStatus: target.round_status,
          tournamentStatus: target.tournament_status,
        })
      ) {
        throw new Response(
          "Чек-ин доступен с двух часов до десяти минут перед началом тура",
          { status: 409 },
        );
      }

      await client.query(
        `INSERT INTO season_round_checkins (round_id, player_id)
         VALUES ($1, $2)
         ON CONFLICT (round_id, player_id) DO NOTHING`,
        [roundId, user.discordId],
      );
      return Response.json({ ok: true, isCheckedIn: true });
    });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
