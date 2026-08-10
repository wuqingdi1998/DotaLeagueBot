import {
  requireAdmin,
  requireSession,
  responseFromAuthError,
} from "@/lib/auth";
import { transaction } from "@/lib/db";
import { updateApplicationStatus } from "./application-status";

export async function PATCH(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as {
      id?: number;
      status?: string;
      invitationStatus?: string;
      newCaptainId?: string;
    };
    if (!body.id) {
      return Response.json({ error: "Некорректная заявка" }, { status: 400 });
    }

    if (body.newCaptainId) {
      await transaction(async (client) => {
        const application = await client.query<{
          tournament_id: number;
          team_name: string;
        }>(
          `SELECT tournament_id::int, team_name
           FROM tournament_team_applications
           WHERE id = $1 AND captain_discord_id = $2
           FOR UPDATE`,
          [body.id, user.discordId],
        );
        if (!application.rowCount) throw new Error("APPLICATION_NOT_FOUND");
        const newCaptain = await client.query<{ ingame_name: string }>(
          `SELECT p.ingame_name
           FROM tournament_team_members m
           JOIN players p ON p.discord_id = m.player_id
           WHERE m.application_id = $1 AND m.player_id = $2
             AND m.invitation_status = 'accepted'`,
          [body.id, body.newCaptainId],
        );
        if (!newCaptain.rowCount) throw new Error("CAPTAIN_NOT_ELIGIBLE");
        await client.query(
          `UPDATE tournament_team_members
           SET is_captain = (player_id = $2)
           WHERE application_id = $1`,
          [body.id, body.newCaptainId],
        );
        await client.query(
          `UPDATE tournament_team_applications
           SET captain_discord_id = $2, updated_at = NOW()
           WHERE id = $1`,
          [body.id, body.newCaptainId],
        );
        await client.query(
          `INSERT INTO tournament_audit_log
            (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
           VALUES ($1, $2, 'transfer_captain', 'team_application', $3, $4::jsonb)`,
          [
            application.rows[0].tournament_id,
            user.discordId,
            String(body.id),
            JSON.stringify({ newCaptainId: body.newCaptainId }),
          ],
        );
        await client.query(
          `INSERT INTO notification_outbox
            (discord_id, event_type, title, message, action_url)
           VALUES ($1, 'captain_transfer', $2, $3, $4)`,
          [
            body.newCaptainId,
            `Вы стали капитаном: ${application.rows[0].team_name}`,
            `${user.playerName} передал вам роль капитана команды.`,
            process.env.PUBLIC_BASE_URL ?? null,
          ],
        );
      });
      return Response.json({ ok: true });
    }

    if (body.invitationStatus) {
      if (!["accepted", "declined"].includes(body.invitationStatus)) {
        return Response.json(
          { error: "Некорректный ответ на приглашение" },
          { status: 400 },
        );
      }
      await transaction(async (client) => {
        const application = await client.query<{
          captain_discord_id: string;
          team_name: string;
        }>(
          `SELECT captain_discord_id::text, team_name
           FROM tournament_team_applications WHERE id = $1`,
          [body.id],
        );
        if (!application.rowCount) throw new Error("INVITE_NOT_FOUND");
        const updated = await client.query(
          `UPDATE tournament_team_members
           SET invitation_status = $1, responded_at = NOW()
           WHERE application_id = $2 AND player_id = $3
             AND NOT is_captain AND invitation_status = 'invited'
           RETURNING application_id`,
          [body.invitationStatus, body.id, user.discordId],
        );
        if (!updated.rowCount) throw new Error("INVITE_NOT_FOUND");
        await client.query(
          `INSERT INTO notification_outbox
            (discord_id, event_type, title, message, action_url)
           VALUES ($1, 'team_invitation_response', $2, $3, $4)`,
          [
            application.rows[0].captain_discord_id,
            `Ответ на приглашение: ${application.rows[0].team_name}`,
            `${user.playerName} ${
              body.invitationStatus === "accepted" ? "принял" : "отклонил"
            } приглашение в команду.`,
            process.env.PUBLIC_BASE_URL ?? null,
          ],
        );
        if (body.invitationStatus === "declined") {
          await client.query(
            `UPDATE tournament_team_applications
             SET status = 'declined', updated_at = NOW()
             WHERE id = $1`,
            [body.id],
          );
        } else {
          await client.query(
            `UPDATE tournament_team_applications a
             SET status = 'pending', updated_at = NOW()
             WHERE a.id = $1
               AND NOT EXISTS (
                 SELECT 1 FROM tournament_team_members m
                 WHERE m.application_id = a.id
                   AND m.invitation_status <> 'accepted'
               )`,
            [body.id],
          );
        }
      });
      return Response.json({ ok: true });
    }

    const admin = await requireAdmin();
    if (!["approved", "declined", "pending"].includes(body.status ?? "")) {
      return Response.json(
        { error: "Некорректный статус заявки" },
        { status: 400 },
      );
    }
    await updateApplicationStatus({
      applicationId: body.id,
      status: body.status as "approved" | "declined" | "pending",
      actorDiscordId: admin.discordId,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      ["INVITE_NOT_FOUND", "APPLICATION_NOT_FOUND"].includes(error.message)
    ) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "CAPTAIN_NOT_ELIGIBLE") {
      return Response.json(
        { error: "Новым капитаном может стать принявший приглашение игрок" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "MEMBERS_NOT_ACCEPTED") {
      return Response.json(
        { error: "Сначала все игроки должны принять приглашение" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "TOURNAMENT_FULL") {
      return Response.json(
        { error: "Все командные слоты уже заняты" },
        { status: 409 },
      );
    }
    return responseFromAuthError(error);
  }
}
