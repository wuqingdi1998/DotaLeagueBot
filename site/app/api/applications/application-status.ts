import { transaction } from "@/lib/db";

type ApplicationStatus = "approved" | "declined" | "pending";

export async function updateApplicationStatus({
  applicationId,
  status,
  actorDiscordId,
}: {
  applicationId: number;
  status: ApplicationStatus;
  actorDiscordId: string;
}) {
  await transaction(async (client) => {
    if (status === "approved") {
      const requested = await client.query<{
        tournament_id: number;
        max_teams: number;
      }>(
        `SELECT requested.tournament_id::int, tournament.max_teams::int
         FROM tournament_team_applications requested
         JOIN tournaments tournament
           ON tournament.id = requested.tournament_id
         WHERE requested.id = $1
         FOR UPDATE OF requested, tournament`,
        [applicationId],
      );
      if (!requested.rowCount) throw new Error("APPLICATION_NOT_FOUND");
      const tournamentId = requested.rows[0].tournament_id;
      await client.query(
        "SELECT pg_advisory_xact_lock(71002, $1::int)",
        [tournamentId],
      );
      const notAccepted = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM tournament_team_members
         WHERE application_id = $1
           AND invitation_status <> 'accepted'`,
        [applicationId],
      );
      if (notAccepted.rows[0].count > 0) {
        throw new Error("MEMBERS_NOT_ACCEPTED");
      }
      const approved = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM tournament_team_applications
         WHERE tournament_id = $1
           AND status = 'approved'
           AND id <> $2`,
        [tournamentId, applicationId],
      );
      if (approved.rows[0].count >= requested.rows[0].max_teams) {
        throw new Error("TOURNAMENT_FULL");
      }
    }

    const updated = await client.query<{
      tournament_id: number;
      captain_discord_id: string;
      team_name: string;
    }>(
      `UPDATE tournament_team_applications
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING tournament_id::int, captain_discord_id::text, team_name`,
      [status, applicationId],
    );
    if (!updated.rowCount) throw new Error("APPLICATION_NOT_FOUND");
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'status_change', 'team_application', $3, $4::jsonb)`,
      [
        updated.rows[0].tournament_id,
        actorDiscordId,
        String(applicationId),
        JSON.stringify({ status }),
      ],
    );
    await client.query(
      `INSERT INTO notification_outbox
        (discord_id, event_type, title, message, action_url)
       VALUES ($1, 'team_application_status', $2, $3, $4)`,
      [
        updated.rows[0].captain_discord_id,
        `Статус заявки: ${updated.rows[0].team_name}`,
        status === "approved"
          ? "Организатор допустил команду к турниру."
          : status === "declined"
            ? "Организатор отклонил заявку команды."
            : "Заявка команды возвращена на проверку.",
        process.env.PUBLIC_BASE_URL ?? null,
      ],
    );
  });
}
