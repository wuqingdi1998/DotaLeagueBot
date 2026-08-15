import { getSession } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { defaultSeasonFacts } from "@/lib/season-facts";
export { POST } from "./tournament-create";
export { PATCH } from "./tournament-update";

export const dynamic = "force-dynamic";

type TournamentRow = Record<string, unknown> & { id: number };
type MemberRow = {
  application_id: number;
  player_id: string | null;
  dota_id: string | null;
  archive_identity_id: string | null;
  ingame_name: string;
  role: string;
  is_captain: boolean;
  invitation_status: string;
  tier_snapshot: number | null;
};

type ApplicationRow = Record<string, unknown> & {
  id: number;
  captain_discord_id: string | null;
  captain_name: string | null;
};
type SeasonFactRow = {
  id: number;
  tournament_id: number;
  sort_order: number;
  value: string;
  label: string;
};

function publicApplication(
  application: ApplicationRow,
  members: MemberRow[],
  includeContact: boolean,
  viewer: Awaited<ReturnType<typeof getSession>>,
) {
  const captain = members.find((member) => member.is_captain);
  const others = members
    .filter((member) => !member.is_captain)
    .sort((left, right) => left.role.localeCompare(right.role));
  const fallback = {
    ingame_name: "Не указан",
    role: "safe_lane",
  };
  const canSeeAllMemberIds =
    viewer?.isAdmin === true ||
    application.captain_discord_id === viewer?.discordId;
  return {
    ...application,
    captain_discord_id: canSeeAllMemberIds
      ? application.captain_discord_id
      : null,
    contact: includeContact ? application.contact : "",
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
      discord_id:
        canSeeAllMemberIds || member.player_id === viewer?.discordId
          ? member.player_id
          : null,
      dota_id: member.dota_id,
      archive_identity_id: viewer?.isAdmin ? member.archive_identity_id : null,
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
       description, about, start_at,
       (SELECT MIN(match.scheduled_at) FROM tournament_matches match
        WHERE match.tournament_id = tournaments.id) AS first_match_at,
       end_at, registration_deadline,
       status_label, format, team_size, max_teams, region, server,
       check_in_minutes, group_format, playoff_format, final_format,
       max_team_tier::int, show_tiers,
       playoff_type, tournament_type, season_round_count::int,
       season_activity_points_note,
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

  const registrationCaptain = user
    ? await one<{ tier: number | null }>(
        `SELECT COALESCE(
           NULLIF(internal_rating, 0),
           CASE
             WHEN rank_tier >= 10 THEN rank_tier / 10
             WHEN rank_tier > 0 THEN rank_tier
             ELSE NULL
           END
         )::int AS tier
         FROM players
         WHERE discord_id = $1 AND is_archived = FALSE`,
        [user.discordId],
      )
    : null;

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
    scheduleDays,
    scheduleEntries,
    seasonFacts,
  ] =
    await Promise.all([
      query<ApplicationRow>(
        `SELECT a.id::int, a.tournament_id::int, a.team_name, a.tag,
           a.captain_discord_id::text, a.contact, a.logo_key, a.status, a.created_at,
           a.selection_method, a.team_tier_total_snapshot,
           EXISTS (
             SELECT 1 FROM tournament_team_checkins checkin
             WHERE checkin.tournament_id = a.tournament_id
               AND checkin.application_id = a.id
           ) AS is_checked_in,
           EXISTS (
             SELECT 1 FROM tournament_team_members confirmation_member
             WHERE confirmation_member.application_id = a.id
           ) AS uses_player_confirmation,
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
           SELECT m.application_id, m.player_id, p.steam_id32::text AS dota_id,
             NULL::text AS archive_identity_id,
             p.ingame_name, m.role, m.is_captain, m.invitation_status,
             m.tier_snapshot, 0 AS source_order
           FROM tournament_team_members m
           JOIN players p ON p.discord_id = m.player_id
           JOIN visible_applications a ON a.id = m.application_id
           UNION ALL
           SELECT snapshot.application_id, snapshot.player_id,
             COALESCE(
               active_player.steam_id32::text,
               CASE WHEN p.is_archived THEN NULL ELSE p.steam_id32::text END
             ) AS dota_id,
             CASE WHEN identity.registered_player_id IS NULL
               THEN identity.id::text ELSE NULL END AS archive_identity_id,
             snapshot.nickname_snapshot AS ingame_name,
             snapshot.role, snapshot.is_captain, 'accepted' AS invitation_status,
             snapshot.tier_snapshot, 1 AS source_order
           FROM tournament_roster_snapshots snapshot
           JOIN visible_applications a ON a.id = snapshot.application_id
           LEFT JOIN players p ON p.discord_id = snapshot.player_id
           LEFT JOIN player_identity_members identity_member
             ON identity_member.player_id = snapshot.player_id
           LEFT JOIN player_identities identity
             ON identity.id = identity_member.identity_id
           LEFT JOIN players active_player
             ON active_player.discord_id = identity.registered_player_id
            AND active_player.is_archived = FALSE
           WHERE NOT EXISTS (
             SELECT 1 FROM tournament_team_members live
             WHERE live.application_id = snapshot.application_id
           )
         )
         SELECT application_id::int, player_id::text, dota_id,
           archive_identity_id, ingame_name, role, is_captain, invitation_status,
           tier_snapshot::int
         FROM roster
         ORDER BY application_id,
           CASE role
             WHEN 'safe_lane' THEN 1 WHEN 'mid_lane' THEN 2
             WHEN 'off_lane' THEN 3 WHEN 'soft_support' THEN 4
             WHEN 'hard_support' THEN 5 ELSE 6
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
           m.bracket_grid_column::int, m.bracket_grid_row::int,
           m.eliminated_team_application_id::int,
           m.winner_to_match_id::int, m.winner_to_slot,
           m.loser_to_match_id::int, m.loser_to_slot
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
           g.id::int AS group_id,
           a.id::int AS application_id,
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
        `SELECT id::int, tournament_id::int, name, sort_order,
           explanation, team_capacity::int, advance_to_playoff::int,
           advance_to_upper::int, advance_to_lower::int
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
               AND a.status = 'awaiting_members'
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
      query<Record<string, unknown>>(
        `SELECT id::int, tournament_id::int, day_date::text, title, sort_order
         FROM tournament_schedule_days
         WHERE tournament_id = $1
         ORDER BY sort_order, day_date, id`,
        [tournament.id],
      ),
      query<Record<string, unknown>>(
        `SELECT entry.id::int, entry.day_id::int,
           TO_CHAR(entry.start_time, 'HH24:MI') AS start_time,
           entry.stage_name, entry.match_count::int,
           entry.series_format, entry.sort_order
         FROM tournament_schedule_entries entry
         JOIN tournament_schedule_days day ON day.id = entry.day_id
         WHERE day.tournament_id = $1
         ORDER BY day.sort_order, entry.sort_order, entry.start_time, entry.id`,
        [tournament.id],
      ),
      query<SeasonFactRow>(
        `SELECT id::int, tournament_id::int, sort_order::int,
           value_text AS value, label
         FROM tournament_season_facts
         WHERE tournament_id = $1
         ORDER BY sort_order, id`,
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
  const resolvedSeasonFacts =
    tournament.tournament_type === "seasonal" && !seasonFacts.length
      ? defaultSeasonFacts(Number(tournament.season_round_count), 0).map(
          (fact, index) => ({
            id: -(index + 1),
            tournament_id: tournament.id,
            sort_order: index + 1,
            ...fact,
          }),
        )
      : seasonFacts;

  return Response.json({
    tournament,
    applications: applications.map((application) =>
      publicApplication(
        application,
        membersByApplication.get(application.id) ?? [],
        user?.isAdmin === true,
        user,
      ),
    ),
    matches,
    standings,
    groups,
    rules,
    prizes,
    scheduleDays: scheduleDays.map((day) => ({
      ...day,
      entries: scheduleEntries.filter((entry) => entry.day_id === day.id),
    })),
    seasonFacts: resolvedSeasonFacts,
    registrationCaptainTier: registrationCaptain?.tier ?? null,
    user,
    invitations,
  });
}
