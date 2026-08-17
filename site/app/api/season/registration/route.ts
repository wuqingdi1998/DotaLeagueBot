import { requireSession, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { seasonRoundRegistrationIsOpen } from "@/lib/season-round-registration";

export const dynamic = "force-dynamic";

type RegistrationTarget = {
  id: number;
  tournament_id: number;
  scheduled_at: Date | null;
  round_kind: "regular" | "finals";
  round_status: "planned" | "active" | "completed" | "cancelled";
  tournament_status:
    | "draft"
    | "registration"
    | "active"
    | "finished"
    | "archived";
  is_visible: boolean;
};

function registrationRoundId(value: unknown): number {
  const roundId = Number(value);
  if (!Number.isInteger(roundId) || roundId <= 0) {
    throw new Response("Некорректный тур", { status: 400 });
  }
  return roundId;
}

async function updateRegistration(
  request: Request,
  action: "register" | "cancel",
) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;
    const roundId = registrationRoundId(body.roundId);
    return await transaction(async (client) => {
      const result = await client.query<RegistrationTarget>(
        `SELECT round.id::int, round.tournament_id::int,
           round.scheduled_at, round.round_kind,
           round.status AS round_status,
           tournament.status AS tournament_status, round.is_visible
         FROM season_rounds round
         JOIN tournaments tournament ON tournament.id = round.tournament_id
         WHERE round.id = $1 AND tournament.tournament_type = 'seasonal'
         FOR UPDATE OF round`,
        [roundId],
      );
      const target = result.rows[0];
      if (!target) {
        throw new Response("Тур не найден", { status: 404 });
      }
      if (
        !target.is_visible ||
        !seasonRoundRegistrationIsOpen({
          scheduledAt: target.scheduled_at,
          now: new Date(),
          roundKind: target.round_kind,
          roundStatus: target.round_status,
          tournamentStatus: target.tournament_status,
        })
      ) {
        throw new Response(
          "Регистрация и её отмена закрываются за 24 часа до начала тура",
          { status: 409 },
        );
      }

      if (action === "register") {
        await client.query(
          `INSERT INTO season_participants (tournament_id, player_id)
           VALUES ($1, $2)
           ON CONFLICT (tournament_id, player_id) DO NOTHING`,
          [target.tournament_id, user.discordId],
        );
        await client.query(
          `INSERT INTO season_round_registrations (round_id, player_id)
           VALUES ($1, $2)
           ON CONFLICT (round_id, player_id) DO NOTHING`,
          [target.id, user.discordId],
        );
      } else {
        await client.query(
          `DELETE FROM season_round_registrations
           WHERE round_id = $1 AND player_id = $2`,
          [target.id, user.discordId],
        );
      }

      return Response.json({
        ok: true,
        isRegistered: action === "register",
      });
    });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function POST(request: Request) {
  return updateRegistration(request, "register");
}

export async function DELETE(request: Request) {
  return updateRegistration(request, "cancel");
}
