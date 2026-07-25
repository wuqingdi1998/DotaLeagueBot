import { getSession, requireAdmin, responseFromAuthError } from "@/lib/auth";
import { one, query, transaction } from "@/lib/db";

export const dynamic = "force-dynamic";

type TournamentRow = Record<string, unknown> & { id: number };
type MemberRow = {
  application_id: number;
  player_id: string | null;
  dota_id: string | null;
  ingame_name: string;
  role: string;
  is_captain: boolean;
  invitation_status: string;
  tier_snapshot: number | null;
};

type ApplicationRow = Record<string, unknown> & {
  id: number;
  captain_name: string | null;
};

function publicApplication(
  application: ApplicationRow,
  members: MemberRow[],
) {
  const captain = members.find((member) => member.is_captain);
  const others = members
    .filter((member) => !member.is_captain)
    .sort((left, right) => left.role.localeCompare(right.role));
  const fallback = {
    ingame_name: "Не указан",
    role: "safe_lane",
  };
  return {
    ...application,
    captain: captain?.ingame_name ?? application.captain_name,
    captain_role: captain?.role ?? "safe_lane",
    player_2: (others[0] ?? fallback).ingame_name,
    player_2_role: (others[0] ?? fallback).role,
    player_3: (others[1] ?? fallback).ingame_name,
    player_3_role: (others[1] ?? fallback).role,
    player_4: (others[2] ?? fallback).ingame_name,
    player_4_role: (others[2] ?? fallback).role,
    player_5: (others[3] ?? fallback).ingame_name,
    player_5_role: (others[3] ?? fallback).role,
    members: members.map((member) => ({
      discord_id: member.player_id,
      dota_id: member.dota_id,
      name: member.ingame_name,
      role: member.role,
      is_captain: member.is_captain,
      invitation_status: member.invitation_status,
      tier_snapshot: member.tier_snapshot,
    })),
  };
}

export async function GET(request: Request) {
  const user = await getSession();
  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  const tournamentFilter = slug
    ? user?.isAdmin
      ? "WHERE slug = $1"
      : "WHERE slug = $1 AND status <> 'draft'"
    : "WHERE status NOT IN ('draft', 'archived')";
  const tournament = await one<TournamentRow>(
    `SELECT id::int, slug, name, eyebrow, headline, headline_accent,
       description, about, start_at, end_at, registration_deadline,
       status_label, format, team_size, max_teams, region, server,
       check_in_minutes, group_format, playoff_format, final_format,
       discord_url, status, updated_at
     FROM tournaments
     ${tournamentFilter}
     ORDER BY start_at ASC
     LIMIT 1`,
    slug ? [slug] : [],
  );

  if (!tournament) {
    return Response.json(
      {
        error: slug ? "Турнир не найден" : "Активный турнир ещё не создан",
        setupRequired: !slug,
        user,
      },
      { status: 404 },
    );
  }

  const visibility = user?.isAdmin
    ? ""
    : user
      ? `AND (
          a.status = 'approved'
          OR a.captain_discord_id = $2
          OR EXISTS (
            SELECT 1 FROM tournament_team_members own_member
            WHERE own_member.application_id = a.id
              AND own_member.player_id = $2
          )
        )`
      : "AND a.status = 'approved'";
  const visibilityValues = user?.isAdmin
    ? [tournament.id]
    : user
      ? [tournament.id, user.discordId]
      : [tournament.id];
  const [
    applications,
    members,
    matches,
    standings,
    groups,
    invitations,
    rules,
    prizes,
  ] =
    await Promise.all([
      query<ApplicationRow>(
        `SELECT a.id::int, a.tournament_id::int, a.team_name, a.tag,
           a.contact, a.logo_key, a.status, a.created_at,
           a.selection_method, a.team_tier_total_snapshot,
           result.placement::int, result.result_label,
           COALESCE(captain.ingame_name, a.captain_name_snapshot) AS captain_name
         FROM tournament_team_applications a
         LEFT JOIN players captain ON captain.discord_id = a.captain_discord_id
         LEFT JOIN tournament_team_results result
           ON result.application_id = a.id
         WHERE a.tournament_id = $1 ${visibility}
         ORDER BY a.created_at ASC`,
        visibilityValues,
      ),
      query<MemberRow>(
        `WITH visible_applications AS (
           SELECT a.*
           FROM tournament_team_applications a
           WHERE a.tournament_id = $1 ${visibility}
         ),
         roster AS (
           SELECT m.application_id, m.player_id, p.steam_id32 AS dota_id,
             p.ingame_name, m.role, m.is_captain, m.invitation_status,
             NULL::smallint AS tier_snapshot, 0 AS source_order
           FROM tournament_team_members m
           JOIN players p ON p.discord_id = m.player_id
           JOIN visible_applications a ON a.id = m.application_id
           UNION ALL
           SELECT snapshot.application_id, snapshot.player_id,
             p.steam_id32 AS dota_id, snapshot.nickname_snapshot AS ingame_name,
             snapshot.role, snapshot.is_captain, 'accepted' AS invitation_status,
             snapshot.tier_snapshot, 1 AS source_order
           FROM tournament_roster_snapshots snapshot
           JOIN visible_applications a ON a.id = snapshot.application_id
           LEFT JOIN players p ON p.discord_id = snapshot.player_id
           WHERE NOT EXISTS (
             SELECT 1 FROM tournament_team_members live
             WHERE live.application_id = snapshot.application_id
           )
         )
         SELECT application_id::int, player_id::text, dota_id::text,
           ingame_name, role, is_captain, invitation_status,
           tier_snapshot::int
         FROM roster
         ORDER BY application_id,
           CASE role
             WHEN 'safe_lane' THEN 1 WHEN 'mid_lane' THEN 2
             WHEN 'off_lane' THEN 3 WHEN 'soft_support' THEN 4 ELSE 5
           END`,
        visibilityValues,
      ),
      query<Record<string, unknown>>(
         `SELECT m.id::int, m.tournament_id::int, m.group_id::int,
           m.scheduled_at, m.stage,
           m.team_a_application_id::int, m.team_b_application_id::int,
           m.team_a_placeholder, m.team_b_placeholder,
           COALESCE(a.team_name, m.team_a_placeholder) AS team_a,
           COALESCE(b.team_name, m.team_b_placeholder) AS team_b,
           m.team_a_score, m.team_b_score, m.best_of, m.sort_order, m.status,
           m.result_type, m.team_a_result_label, m.team_b_result_label,
           m.decision_note, m.bracket_round, m.bracket_side, m.bracket_slot,
           m.winner_to_match_id::int, m.winner_to_slot,
           m.loser_to_match_id::int, m.loser_to_slot,
           EXISTS (
             SELECT 1 FROM tournament_match_checkins c
             WHERE c.match_id = m.id AND c.application_id = m.team_a_application_id
           ) AS team_a_checked_in,
           EXISTS (
             SELECT 1 FROM tournament_match_checkins c
             WHERE c.match_id = m.id AND c.application_id = m.team_b_application_id
           ) AS team_b_checked_in
         FROM tournament_matches m
         LEFT JOIN tournament_team_applications a
           ON a.id = m.team_a_application_id
         LEFT JOIN tournament_team_applications b
           ON b.id = m.team_b_application_id
         WHERE m.tournament_id = $1
         ORDER BY m.sort_order, m.scheduled_at`,
        [tournament.id],
      ),
      query<Record<string, unknown>>(
        `WITH team_results AS (
           SELECT gt.group_id, gt.application_id,
             COUNT(m.id) FILTER (WHERE m.status = 'finished')::int AS games,
             COALESCE(SUM(
               CASE
                 WHEN m.status <> 'finished' THEN 0
                 WHEN m.team_a_application_id = gt.application_id THEN
                   CASE
                     WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tw' THEN 1
                     WHEN LOWER(COALESCE(m.team_a_result_label, '')) = 'tl' THEN 0
                     ELSE COALESCE(m.team_a_score, 0)
                   END
                 WHEN m.team_b_application_id = gt.application_id THEN
                   CASE
                     WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tw' THEN 1
                     WHEN LOWER(COALESCE(m.team_b_result_label, '')) = 'tl' THEN 0
                     ELSE COALESCE(m.team_b_score, 0)
                   END
                 ELSE 0
               END
             ), 0)::int AS maps_won
           FROM tournament_group_teams gt
           LEFT JOIN tournament_matches m
             ON m.group_id = gt.group_id
             AND gt.application_id IN (
               m.team_a_application_id, m.team_b_application_id
             )
           GROUP BY gt.group_id, gt.application_id
         )
         SELECT
           ROW_NUMBER() OVER (
             PARTITION BY g.id
             ORDER BY COALESCE(r.maps_won, 0) DESC, gt.sort_order, a.team_name
           )::int AS id,
           g.tournament_id::int,
           g.name AS group_name,
           ROW_NUMBER() OVER (
             PARTITION BY g.id
             ORDER BY COALESCE(r.maps_won, 0) DESC, gt.sort_order, a.team_name
           )::int AS place,
           a.team_name,
           COALESCE(r.games, 0)::int AS games,
           COALESCE(r.maps_won, 0)::int AS maps_won
         FROM tournament_groups g
         JOIN tournament_group_teams gt ON gt.group_id = g.id
         JOIN tournament_team_applications a ON a.id = gt.application_id
         LEFT JOIN team_results r
           ON r.group_id = gt.group_id AND r.application_id = gt.application_id
         WHERE g.tournament_id = $1
         ORDER BY g.sort_order, place`,
        [tournament.id],
      ),
      query<Record<string, unknown>>(
        `SELECT id::int, tournament_id::int, name, sort_order
         FROM tournament_groups
         WHERE tournament_id = $1
         ORDER BY sort_order, name`,
        [tournament.id],
      ),
      user
        ? query<Record<string, unknown>>(
            `SELECT a.id::int AS application_id, a.team_name, a.tag,
               m.role, m.invitation_status, a.created_at
             FROM tournament_team_members m
             JOIN tournament_team_applications a ON a.id = m.application_id
             WHERE m.player_id = $1 AND NOT m.is_captain
               AND m.invitation_status = 'invited'
             ORDER BY a.created_at DESC`,
            [user.discordId],
          )
        : Promise.resolve([]),
      query<Record<string, unknown>>(
        `SELECT id::int, tournament_id::int, sort_order, rule_text
         FROM tournament_rules
         WHERE tournament_id = $1
         ORDER BY sort_order, id`,
        [tournament.id],
      ),
      query<Record<string, unknown>>(
        `SELECT prize.id::int, prize.tournament_id::int, prize.placement::int,
           prize.application_id::int,
           COALESCE(application.team_name, prize.team_name_snapshot) AS team_name,
           prize.prize_text
         FROM tournament_prizes prize
         LEFT JOIN tournament_team_applications application
           ON application.id = prize.application_id
         WHERE prize.tournament_id = $1
         ORDER BY prize.placement, prize.id`,
        [tournament.id],
      ),
    ]);

  const membersByApplication = new Map<number, MemberRow[]>();
  for (const member of members) {
    const applicationMembers =
      membersByApplication.get(member.application_id) ?? [];
    applicationMembers.push(member);
    membersByApplication.set(member.application_id, applicationMembers);
  }

  return Response.json({
    tournament,
    applications: applications.map((application) =>
      publicApplication(
        application,
        membersByApplication.get(application.id) ?? [],
      ),
    ),
    matches,
    standings,
    groups,
    rules,
    prizes,
    user,
    invitations,
  });
}

const editableFields = [
  "name",
  "eyebrow",
  "headline",
  "headline_accent",
  "description",
  "about",
  "start_at",
  "end_at",
  "registration_deadline",
  "status_label",
  "format",
  "team_size",
  "max_teams",
  "region",
  "server",
  "check_in_minutes",
  "group_format",
  "playoff_format",
  "final_format",
  "discord_url",
  "status",
] as const;

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) {
      return Response.json({ error: "Не указан турнир" }, { status: 400 });
    }
    const values = editableFields.map((field) => body[field]);
    if (
      values.some(
        (value) => value === undefined || value === null || value === "",
      )
    ) {
      return Response.json(
        { error: "Заполните все поля турнира" },
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
          updated_at = NOW()
        WHERE id = $22`,
        [...values, id],
      );
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'update', 'tournament', $1::text)`,
        [id, admin.discordId],
      );
    });
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const slug = String(body.slug ?? "")
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return Response.json(
        { error: "Адрес турнира должен состоять из латинских букв, цифр и дефисов" },
        { status: 400 },
      );
    }
    const values = editableFields.map((field) => body[field]);
    if (values.some((value) => value === undefined || value === "")) {
      return Response.json(
        { error: "Заполните все поля турнира" },
        { status: 400 },
      );
    }
    const created = await transaction(async (client) => {
      const result = await client.query<{ id: number }>(
        `INSERT INTO tournaments (
          slug, name, eyebrow, headline, headline_accent, description, about,
          start_at, end_at, registration_deadline, status_label, format,
          team_size, max_teams, region, server, check_in_minutes,
          group_format, playoff_format, final_format, discord_url, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING id::int`,
        [slug, ...values],
      );
      const id = result.rows[0].id;
      await client.query(
        `INSERT INTO tournament_organizers(tournament_id, discord_id)
         VALUES ($1, $2)`,
        [id, admin.discordId],
      );
      return id;
    });
    return Response.json({ ok: true, id: created }, { status: 201 });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
