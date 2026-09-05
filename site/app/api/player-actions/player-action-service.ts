import { query } from "@/lib/db";
import {
  orderPlayerActionNotifications,
  type PlayerActionNotification,
} from "@/lib/player-action-notifications";
import { seasonRoundCheckInIsOpen } from "@/lib/season-round-registration";
import { tournamentCheckInWindow } from "@/lib/tournament-check-in";
import type { TournamentStatus } from "@/lib/tournaments";

type TeamCheckInRow = {
  application_id: number;
  team_name: string;
  tournament_name: string;
  slug: string;
  check_in_minutes: number;
  first_match_at: Date;
};

type SeasonCheckInRow = {
  round_id: number;
  round_number: number;
  round_kind: "regular" | "finals";
  round_status: "planned" | "active" | "completed" | "cancelled";
  scheduled_at: Date;
  tournament_name: string;
  tournament_status: TournamentStatus;
  slug: string;
};

type TeamInvitationRow = {
  application_id: number;
  team_name: string;
  tournament_name: string;
  slug: string;
  created_at: Date;
};

function teamCheckInNotifications(
  rows: TeamCheckInRow[],
  now: Date,
): PlayerActionNotification[] {
  return rows.flatMap((row) => {
    const window = tournamentCheckInWindow({
      firstMatchAt: row.first_match_at.toISOString(),
      checkInMinutes: row.check_in_minutes,
      now,
    });
    if (!window?.isOpen) return [];
    return [{
      id: `team-check-in:${row.application_id}`,
      kind: "team-check-in" as const,
      href: `/tournaments/${row.slug}#team-check-in-${row.application_id}`,
      label: `Пройти чек-ин команды «${row.team_name}» на турнире «${row.tournament_name}»`,
      dueAt: window.closesAt,
    }];
  });
}

function seasonCheckInNotifications(
  rows: SeasonCheckInRow[],
  now: Date,
): PlayerActionNotification[] {
  return rows.flatMap((row) => {
    const isOpen = seasonRoundCheckInIsOpen({
      scheduledAt: row.scheduled_at,
      now,
      roundKind: row.round_kind,
      roundStatus: row.round_status,
      tournamentStatus: row.tournament_status,
    });
    if (!isOpen) return [];
    return [{
      id: `season-check-in:${row.round_id}`,
      kind: "season-check-in" as const,
      href: `/tournaments/${row.slug}?round=${row.round_number}#season-check-in-${row.round_id}`,
      label: `Пройти чек-ин тура ${row.round_number} в «${row.tournament_name}»`,
      dueAt: row.scheduled_at.toISOString(),
    }];
  });
}

function teamInvitationNotifications(
  rows: TeamInvitationRow[],
): PlayerActionNotification[] {
  return rows.map((row) => ({
    id: `team-invitation:${row.application_id}`,
    kind: "team-invitation",
    href: `/tournaments/${row.slug}#team-invitation-${row.application_id}`,
    label: `Ответить на приглашение в команду «${row.team_name}» на турнире «${row.tournament_name}»`,
    dueAt: row.created_at.toISOString(),
  }));
}

export async function loadPlayerActionNotifications(
  playerId: string,
  now = new Date(),
): Promise<PlayerActionNotification[]> {
  const [teamCheckIns, seasonCheckIns, teamInvitations] = await Promise.all([
    query<TeamCheckInRow>(
      `SELECT application.id::int AS application_id,
         application.team_name, tournament.name AS tournament_name,
         tournament.slug, tournament.check_in_minutes::int,
         first_match.scheduled_at AS first_match_at
       FROM tournament_team_applications application
       JOIN tournaments tournament ON tournament.id = application.tournament_id
       CROSS JOIN LATERAL (
         SELECT MIN(match.scheduled_at) AS scheduled_at
         FROM tournament_matches match
         WHERE match.tournament_id = tournament.id
       ) first_match
       WHERE application.status = 'approved'
         AND application.captain_discord_id = $1
         AND first_match.scheduled_at > NOW()
         AND NOT EXISTS (
           SELECT 1 FROM tournament_team_checkins checkin
           WHERE checkin.tournament_id = tournament.id
             AND checkin.application_id = application.id
         )`,
      [playerId],
    ),
    query<SeasonCheckInRow>(
      `SELECT round.id::int AS round_id, round.round_number::int,
         round.round_kind,
         season_round_status_at(round.scheduled_at, round.status) AS round_status,
         round.scheduled_at, tournament.name AS tournament_name,
         tournament.status AS tournament_status, tournament.slug
       FROM season_round_registrations registration
       JOIN season_rounds round ON round.id = registration.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE registration.player_id = $1
         AND round.is_visible = TRUE
         AND round.scheduled_at > NOW()
         AND NOT EXISTS (
           SELECT 1 FROM season_round_checkins checkin
           WHERE checkin.round_id = round.id
             AND checkin.player_id = registration.player_id
         )`,
      [playerId],
    ),
    query<TeamInvitationRow>(
      `SELECT application.id::int AS application_id,
         application.team_name, tournament.name AS tournament_name,
         tournament.slug, application.created_at
       FROM tournament_team_members member
       JOIN tournament_team_applications application
         ON application.id = member.application_id
       JOIN tournaments tournament ON tournament.id = application.tournament_id
       WHERE member.player_id = $1
         AND NOT member.is_captain
         AND member.invitation_status = 'invited'
         AND application.status = 'awaiting_members'`,
      [playerId],
    ),
  ]);

  return orderPlayerActionNotifications([
    ...teamCheckInNotifications(teamCheckIns, now),
    ...seasonCheckInNotifications(seasonCheckIns, now),
    ...teamInvitationNotifications(teamInvitations),
  ]);
}
