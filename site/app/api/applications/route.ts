import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  requireAdmin,
  requireSession,
  responseFromAuthError,
} from "@/lib/auth";
import { one, transaction } from "@/lib/db";
import {
  getTeamNameError,
  rolesAreComplete,
} from "@/lib/validation";
import {
  allowedTeamImageTypes as allowedImageTypes,
  hasExpectedImageSignature as hasExpectedSignature,
  resolveApplicationPlayer as resolvePlayer,
  outdatedTierApplicationError,
  type ApplicationPlayerRow as PlayerRow,
} from "./application-support";
import { updateApplicationStatus } from "./application-status";

export const dynamic = "force-dynamic";

function uploadsDirectory(): string {
  return path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "team-emblems",
  );
}

export async function POST(request: Request) {
  let storedFile: string | null = null;
  try {
    const captain = await requireSession();
    const body = await request.formData();
    const requiredFields = [
      "tournament_id",
      "team_name",
      "tag",
      "contact",
      "player_2",
      "player_3",
      "player_4",
      "player_5",
      "captain_role",
      "player_2_role",
      "player_3_role",
      "player_4_role",
      "player_5_role",
    ] as const;
    if (
      requiredFields.some(
        (field) => !String(body.get(field) ?? "").trim(),
      )
    ) {
      return Response.json(
        { error: "Заполните все поля состава команды" },
        { status: 400 },
      );
    }

    const tournamentId = Number(body.get("tournament_id"));
    const tournament = await one<{
      id: number;
      registration_open: boolean;
      max_teams: number;
    }>(
      `SELECT id::int,
        (status = 'registration' AND registration_deadline > NOW()) AS registration_open,
        max_teams
       FROM tournaments WHERE id = $1`,
      [tournamentId],
    );
    if (!tournament) {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    if (!tournament.registration_open) {
      return Response.json(
        { error: "Регистрация на турнир закрыта" },
        { status: 409 },
      );
    }

    const teamName = String(body.get("team_name")).trim();
    const teamNameError = getTeamNameError(teamName);
    if (teamNameError) {
      return Response.json({ error: teamNameError }, { status: 400 });
    }
    const tag = String(body.get("tag")).trim().toUpperCase();
    if (!/^[A-Za-zА-Яа-яЁё0-9]{1,5}$/.test(tag)) {
      return Response.json(
        { error: "Тег: от 1 до 5 букв или цифр" },
        { status: 400 },
      );
    }
    const contact = String(body.get("contact")).trim();
    if (contact.length > 100) {
      return Response.json(
        { error: "Контакт не может быть длиннее 100 символов" },
        { status: 400 },
      );
    }

    const selectedRoles = [
      body.get("captain_role"),
      body.get("player_2_role"),
      body.get("player_3_role"),
      body.get("player_4_role"),
      body.get("player_5_role"),
    ].map(String);
    if (!rolesAreComplete(selectedRoles)) {
      return Response.json(
        { error: "В составе должна быть ровно одна каждая роль: позиции с 1-й по 5-ю" },
        { status: 400 },
      );
    }

    const memberNames = [
      captain.playerName,
      String(body.get("player_2")),
      String(body.get("player_3")),
      String(body.get("player_4")),
      String(body.get("player_5")),
    ];
    const resolvedMembers = await Promise.all(memberNames.map(resolvePlayer));
    if (resolvedMembers.some((player) => !player)) {
      return Response.json(
        {
          error:
            "Все игроки должны быть зарегистрированы через бота. Выберите точные игровые ники из списка.",
        },
        { status: 400 },
      );
    }
    const members = resolvedMembers as PlayerRow[];
    if (new Set(members.map((member) => member.discord_id)).size !== 5) {
      return Response.json(
        { error: "Каждый игрок может быть указан в составе только один раз" },
        { status: 400 },
      );
    }
    const outdatedTierError = outdatedTierApplicationError(members);
    if (outdatedTierError) {
      return Response.json({ error: outdatedTierError }, { status: 409 });
    }

    const emblem = body.get("emblem");
    if (!(emblem instanceof File) || emblem.size === 0) {
      return Response.json(
        { error: "Загрузите эмблему команды" },
        { status: 400 },
      );
    }
    if (emblem.size > 2 * 1024 * 1024) {
      return Response.json(
        { error: "Размер эмблемы не должен превышать 2 МБ" },
        { status: 400 },
      );
    }
    const extension = allowedImageTypes.get(emblem.type);
    if (!extension) {
      return Response.json(
        { error: "Эмблема должна быть в формате PNG, JPG или WebP" },
        { status: 400 },
      );
    }
    const fileData = new Uint8Array(await emblem.arrayBuffer());
    if (!hasExpectedSignature(fileData, extension)) {
      return Response.json(
        { error: "Файл эмблемы повреждён или имеет неверный формат" },
        { status: 400 },
      );
    }

    const logoKey = `${crypto.randomUUID()}.${extension}`;
    const directory = uploadsDirectory();
    await mkdir(directory, { recursive: true });
    storedFile = path.join(directory, logoKey);
    await writeFile(storedFile, fileData, { flag: "wx" });

    const applicationId = await transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(71001, $1::int)",
        [tournamentId],
      );
      const currentTournament = await client.query<{
        registration_open: boolean;
      }>(
        `SELECT
           (status = 'registration' AND registration_deadline > NOW())
             AS registration_open
         FROM tournaments
         WHERE id = $1
         FOR UPDATE`,
        [tournamentId],
      );
      if (!currentTournament.rowCount) throw new Error("TOURNAMENT_NOT_FOUND");
      if (!currentTournament.rows[0].registration_open) {
        throw new Error("REGISTRATION_CLOSED");
      }
      const existing = await client.query(
        `SELECT 1 FROM tournament_team_members m
         JOIN tournament_team_applications a ON a.id = m.application_id
         WHERE a.tournament_id = $1
           AND a.status NOT IN ('declined', 'withdrawn')
           AND m.player_id = ANY($2::bigint[])
         LIMIT 1`,
        [tournamentId, members.map((member) => member.discord_id)],
      );
      if (existing.rowCount) {
        throw new Error("PLAYER_ALREADY_IN_TEAM");
      }

      const created = await client.query<{ id: number }>(
        `INSERT INTO tournament_team_applications
          (tournament_id, team_name, tag, captain_discord_id, contact, logo_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::int`,
        [
          tournamentId,
          teamName,
          tag,
          captain.discordId,
          contact,
          logoKey,
        ],
      );
      const id = created.rows[0].id;
      for (let index = 0; index < members.length; index += 1) {
        await client.query(
          `INSERT INTO tournament_team_members
            (application_id, player_id, role, is_captain, invitation_status, responded_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            members[index].discord_id,
            selectedRoles[index],
            index === 0,
            index === 0 ? "accepted" : "invited",
            index === 0 ? new Date() : null,
          ],
        );
        if (index > 0) {
          await client.query(
            `INSERT INTO notification_outbox
              (discord_id, event_type, title, message, action_url)
             VALUES ($1, 'team_invitation', $2, $3, $4)`,
            [
              members[index].discord_id,
              `Приглашение в ${teamName}`,
              `${captain.playerName} приглашает вас в состав на турнир. Подтвердите или отклоните приглашение на сайте.`,
              process.env.PUBLIC_BASE_URL ?? null,
            ],
          );
        }
      }
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'create', 'team_application', $3)`,
        [tournamentId, captain.discordId, String(id)],
      );
      return id;
    });
    storedFile = null;
    return Response.json(
      {
        ok: true,
        id: applicationId,
        message: "Игрокам отправлены приглашения на сайте",
      },
      { status: 201 },
    );
  } catch (error) {
    if (storedFile) await unlink(storedFile).catch(() => undefined);
    if (error instanceof Error && error.message === "PLAYER_ALREADY_IN_TEAM") {
      return Response.json(
        { error: "Один из игроков уже заявлен за другую команду" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "REGISTRATION_CLOSED") {
      return Response.json(
        { error: "Регистрация на турнир закрыта" },
        { status: 409 },
      );
    }
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return Response.json(
        { error: "Команда с таким названием или тегом уже зарегистрирована" },
        { status: 409 },
      );
    }
    return responseFromAuthError(error);
  }
}

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
