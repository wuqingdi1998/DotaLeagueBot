import { getSession } from "@/lib/auth";
import { one, query } from "@/lib/db";
import type { TournamentStatus } from "@/lib/tournaments";
import {
  calculateSeasonStandings,
  type SeasonStandingIdentity,
  type SeasonStandingMatch,
} from "@/lib/season";
import { calculateSeasonPenalty } from "@/lib/season-discipline";
import { deriveSeasonFinalMedals } from "@/lib/season-finals";
import {
  seasonRoundCancellationDeadline,
  seasonRoundCancellationIsOpen,
  seasonRoundCheckInIsAvailable,
  seasonRoundCheckInIsOpen,
  seasonRoundCheckInWindow,
  seasonRoundRegistrationDeadline,
  seasonRoundRegistrationIsOpen,
} from "@/lib/season-round-registration";
import { loadSeasonExtras } from "./season-extra-query";
import type {
  GameRow,
  LobbyRow,
  MatchRow,
  ParticipantRow,
  RoundRegistrationRow,
  RoundRow,
  SeasonPlayerRow,
} from "./season-route-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSession();
  const isOrganizer = user?.isAdmin === true;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim();
  const requestedRound = Number(url.searchParams.get("round") || 0);
  if (!slug) {
    return Response.json({ error: "Не указан турнир" }, { status: 400 });
  }
  if (requestedRound && !Number.isInteger(requestedRound)) {
    return Response.json({ error: "Некорректный номер тура" }, { status: 400 });
  }

  const tournament = await one<{
    id: number;
    tournament_type: string;
    status: TournamentStatus;
  }>(
    `SELECT id::int, tournament_type, status
     FROM tournaments
     WHERE slug = $1 ${isOrganizer ? "" : "AND status <> 'draft'"}`,
    [slug],
  );
  if (!tournament || tournament.tournament_type !== "seasonal") {
    return Response.json({ error: "Сезонный турнир не найден" }, { status: 404 });
  }

  const visibility = isOrganizer ? "" : "AND round.is_visible = TRUE";
  const lobbyVisibility = isOrganizer
    ? ""
    : "AND (round.round_kind = 'finals' OR round.lobby_configuration_status = 'published')";
  const matchVisibility = isOrganizer
    ? ""
    : `AND (
        (round.round_kind = 'regular'
          AND round.lobby_configuration_status = 'published')
        OR
        (round.round_kind = 'finals'
          AND match.status IN ('published', 'completed'))
      )`;
  const gameVisibility = isOrganizer
    ? ""
    : "AND game.status IN ('published', 'completed')";

  const [
    rounds,
    lobbies,
    matches,
    participants,
    games,
    seasonPlayers,
    roundRegistrations,
    [pointAdjustments, penaltyEvents, substitutions, finalists],
  ] =
    await Promise.all([
      query<RoundRow>(
        `SELECT round.id::int, round.tournament_id::int,
           round.round_number::int, round.name, round.status,
           round.scheduled_at, round.is_visible, round.round_kind,
           round.lobby_configuration_status,
           COUNT(DISTINCT lobby.id)::int AS lobby_count,
           COUNT(DISTINCT match.id) FILTER (
             WHERE match.status = 'completed'
           )::int AS played_match_count,
           COUNT(DISTINCT registration.player_id)::int AS registration_count,
           COALESCE(BOOL_OR(registration.player_id = $2::bigint), FALSE)
             AS is_registered,
           EXISTS (
             SELECT 1 FROM season_round_checkins checkin
             WHERE checkin.round_id = round.id
               AND checkin.player_id = $2::bigint
           ) AS is_checked_in
         FROM season_rounds round
         LEFT JOIN season_lobbies lobby ON lobby.round_id = round.id
         LEFT JOIN season_matches match ON match.lobby_id = lobby.id
         LEFT JOIN season_round_registrations registration
           ON registration.round_id = round.id
         WHERE round.tournament_id = $1 ${visibility}
         GROUP BY round.id
         ORDER BY round.round_number`,
        [tournament.id, user?.discordId ?? null],
      ),
      query<LobbyRow>(
        `SELECT lobby.id::int, lobby.round_id::int, lobby.name,
           lobby.sort_order, lobby.status, lobby.scheduled_at
         FROM season_lobbies lobby
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility} ${lobbyVisibility}
         ORDER BY round.round_number, lobby.sort_order, lobby.id`,
        [tournament.id],
      ),
      query<MatchRow>(
        `SELECT match.id::int, match.lobby_id::int, round.id::int AS round_id,
           round.round_number::int, lobby.name AS lobby_name,
           match.scheduled_at, match.team_a_name, match.team_b_name,
           match.best_of::int, match.team_a_score::int,
           match.team_b_score::int, match.result, match.status,
           match.sort_order, match.host_player_id::text,
           EXISTS (
             SELECT 1 FROM season_match_room_players room_participant
             WHERE room_participant.match_id = match.id
               AND room_participant.player_id = $2::bigint
           ) AS can_enter_lobby
         FROM season_matches match
         JOIN season_lobbies lobby ON lobby.id = match.lobby_id
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility} ${matchVisibility}
         ORDER BY round.round_number, lobby.sort_order, match.sort_order`,
        [tournament.id, user?.discordId ?? null],
      ),
      query<ParticipantRow>(
      `SELECT participant.match_id::int, participant.player_id::text,
           COALESCE(current_player.steam_id32, player.steam_id32)::text AS dota_id,
           COALESCE(NULLIF(participant.nickname_snapshot, ''), player.ingame_name) AS nickname,
           COALESCE(NULLIF(current_player.avatar_url, ''), player.avatar_url) AS avatar_url,
           COALESCE(NULLIF(current_player.positions, ''), player.positions)
             AS positions,
           participant.team_side, participant.is_captain,
           participant.tier_snapshot::int,
           participant.slot_number::int,
           participant.player_id = match.host_player_id AS is_host
         FROM season_match_participants participant
         JOIN players player ON player.discord_id = participant.player_id
         LEFT JOIN player_identity_members identity_member
           ON identity_member.player_id = participant.player_id
         LEFT JOIN player_identities identity
           ON identity.id = identity_member.identity_id
         LEFT JOIN players current_player
           ON current_player.discord_id = identity.registered_player_id
          AND current_player.is_archived = FALSE
         JOIN season_matches match ON match.id = participant.match_id
         JOIN season_lobbies lobby ON lobby.id = match.lobby_id
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility} ${matchVisibility}
         ORDER BY participant.match_id, participant.team_side,
           participant.slot_number NULLS LAST,
           participant.tier_snapshot DESC NULLS LAST, nickname`,
        [tournament.id],
      ),
      query<GameRow>(
        `SELECT game.id::int, game.match_id::int, game.game_number::int,
           game.dota_match_id, game.winner_side, game.duration_seconds::int,
           game.status
         FROM season_match_games game
         JOIN season_matches match ON match.id = game.match_id
         JOIN season_lobbies lobby ON lobby.id = match.lobby_id
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility}
           ${matchVisibility} ${gameVisibility}
         ORDER BY game.match_id, game.game_number`,
        [tournament.id],
      ),
      query<SeasonPlayerRow>(
        `SELECT player.discord_id::text,
           COALESCE(current_player.steam_id32, player.steam_id32)::text AS dota_id,
           COALESCE(NULLIF(participant.nickname_snapshot, ''), player.ingame_name) AS nickname,
           COALESCE(NULLIF(current_player.avatar_url, ''), player.avatar_url) AS avatar_url,
           participant.standings_section,
           participant.inactive_reason, participant.rank_snapshot::int,
           participant.standings_snapshot
         FROM season_participants participant
         JOIN players player ON player.discord_id = participant.player_id
         LEFT JOIN player_identity_members identity_member
           ON identity_member.player_id = participant.player_id
         LEFT JOIN player_identities identity
           ON identity.id = identity_member.identity_id
         LEFT JOIN players current_player
           ON current_player.discord_id = identity.registered_player_id
          AND current_player.is_archived = FALSE
         WHERE participant.tournament_id = $1
           ${isOrganizer ? "" : `AND (
             participant.standings_snapshot IS NOT NULL
             OR
             EXISTS (
               SELECT 1
               FROM season_match_participants public_participant
               JOIN season_matches public_match
                 ON public_match.id = public_participant.match_id
               JOIN season_lobbies public_lobby
                 ON public_lobby.id = public_match.lobby_id
               JOIN season_rounds public_round
                 ON public_round.id = public_lobby.round_id
               WHERE public_participant.player_id = participant.player_id
                 AND public_round.tournament_id = participant.tournament_id
                 AND public_round.is_visible = TRUE
                 AND public_match.status IN ('published', 'completed')
             )
             OR EXISTS (
               SELECT 1 FROM season_point_adjustments adjustment
               LEFT JOIN season_rounds adjustment_round
                 ON adjustment_round.id = adjustment.round_id
               WHERE adjustment.tournament_id = participant.tournament_id
                 AND adjustment.player_id = participant.player_id
                 AND (
                   adjustment.round_id IS NULL
                   OR adjustment_round.is_visible = TRUE
                 )
             )
             OR EXISTS (
               SELECT 1 FROM season_penalty_events penalty
               JOIN season_rounds penalty_round
                 ON penalty_round.id = penalty.round_id
               WHERE penalty.tournament_id = participant.tournament_id
                 AND penalty.player_id = participant.player_id
                 AND penalty_round.is_visible = TRUE
             )
             OR EXISTS (
               SELECT 1 FROM season_finalists finalist
               JOIN season_rounds finals_round
                 ON finals_round.tournament_id = finalist.tournament_id
                AND finals_round.round_kind = 'finals'
               WHERE finalist.tournament_id = participant.tournament_id
                 AND finalist.player_id = participant.player_id
                 AND finals_round.is_visible = TRUE
             )
           )`}
         ORDER BY nickname`,
        [tournament.id],
      ),
      query<RoundRegistrationRow>(
        `SELECT registration.round_id::int,
           player.discord_id::text AS player_id,
           COALESCE(current_player.steam_id32, player.steam_id32)::text AS dota_id,
           COALESCE(NULLIF(current_player.ingame_name, ''), player.ingame_name)
             AS nickname,
           COALESCE(NULLIF(current_player.avatar_url, ''), player.avatar_url)
             AS avatar_url,
           COALESCE(NULLIF(current_player.positions, ''), player.positions)
             AS positions,
           registration.tier_snapshot::int,
           registration.created_at,
           checkin.player_id IS NOT NULL AS is_checked_in
         FROM season_round_registrations registration
         JOIN season_rounds round ON round.id = registration.round_id
         JOIN players player ON player.discord_id = registration.player_id
         LEFT JOIN player_identity_members identity_member
           ON identity_member.player_id = registration.player_id
         LEFT JOIN player_identities identity
           ON identity.id = identity_member.identity_id
         LEFT JOIN players current_player
           ON current_player.discord_id = identity.registered_player_id
          AND current_player.is_archived = FALSE
         LEFT JOIN season_round_checkins checkin
           ON checkin.round_id = registration.round_id
          AND checkin.player_id = registration.player_id
         WHERE round.tournament_id = $1 ${visibility}
         ORDER BY round.round_number, registration.created_at,
           registration.player_id`,
        [tournament.id],
      ),
      loadSeasonExtras(tournament.id, isOrganizer),
    ]);

  if (
    requestedRound &&
    !rounds.some((round) => round.round_number === requestedRound)
  ) {
    return Response.json({ error: "Тур не найден" }, { status: 404 });
  }

  const participantByMatch = new Map<number, ParticipantRow[]>();
  for (const participant of participants) {
    const rows = participantByMatch.get(participant.match_id) ?? [];
    rows.push(participant);
    participantByMatch.set(participant.match_id, rows);
  }
  const gamesByMatch = new Map<number, GameRow[]>();
  for (const game of games) {
    const rows = gamesByMatch.get(game.match_id) ?? [];
    rows.push(game);
    gamesByMatch.set(game.match_id, rows);
  }

  const nestedMatches = matches.map((match) => ({
    ...match,
    participants: participantByMatch.get(match.id) ?? [],
    games: gamesByMatch.get(match.id) ?? [],
    substitutions: substitutions.filter(
      (substitution) => substitution.match_id === match.id,
    ),
  }));
  const nestedLobbies = lobbies.map((lobby) => ({
    ...lobby,
    matches: nestedMatches.filter((match) => match.lobby_id === lobby.id),
  }));
  const generatedAt = new Date();
  const nestedRounds = rounds.map((round) => {
    const checkInWindow = seasonRoundCheckInWindow(round.scheduled_at);
    const registrationState = {
      scheduledAt: round.scheduled_at,
      now: generatedAt,
      roundKind: round.round_kind,
      roundStatus: round.status,
      tournamentStatus: tournament.status,
    };
    return {
      ...round,
      registration_deadline: seasonRoundRegistrationDeadline(
        round.scheduled_at,
      ),
      cancellation_deadline: seasonRoundCancellationDeadline(
        round.scheduled_at,
      ),
      registration_open:
        round.is_visible &&
        seasonRoundRegistrationIsOpen(registrationState),
      cancellation_open:
        round.is_visible &&
        seasonRoundCancellationIsOpen(registrationState),
      check_in_available:
        round.is_visible && seasonRoundCheckInIsAvailable(registrationState),
      check_in_open:
        round.is_visible && seasonRoundCheckInIsOpen(registrationState),
      check_in_opens_at: checkInWindow?.opensAt ?? null,
      check_in_closes_at: checkInWindow?.closesAt ?? null,
      registrations: roundRegistrations.filter(
        (registration) => registration.round_id === round.id,
      ),
      lobbies: nestedLobbies.filter((lobby) => lobby.round_id === round.id),
    };
  });
  const finalsRoundIds = new Set(
    rounds
      .filter((round) => round.round_kind === "finals")
      .map((round) => round.id),
  );
  const finalistsWithMedals = deriveSeasonFinalMedals(
    finalists.map(({ player_id, ...finalist }) => ({
      ...finalist,
      playerId: player_id,
    })),
    nestedMatches
      .filter((match) => finalsRoundIds.has(match.round_id))
      .map((match) => ({
        status: match.status,
        result: match.result,
        participants: match.participants.map((participant) => ({
          playerId: participant.player_id,
          teamSide: participant.team_side,
        })),
      })),
  ).map(({ playerId, ...finalist }) => ({
    ...finalist,
    player_id: playerId,
  }));

  const standingMatches: SeasonStandingMatch[] = nestedMatches.map((match) => ({
    id: match.id,
    roundId: match.round_id,
    status: match.status,
    result: match.result,
    teamAScore: match.team_a_score,
    teamBScore: match.team_b_score,
    participants: match.participants.map((participant) => ({
      playerId: participant.player_id,
      dotaId: participant.dota_id,
      nickname: participant.nickname,
      avatarUrl: participant.avatar_url,
      teamSide: participant.team_side,
    })),
  }));
  const standingPlayers: SeasonStandingIdentity[] = seasonPlayers.map(
    (player) => ({
      playerId: player.discord_id,
      dotaId: player.dota_id,
      nickname: player.nickname,
      avatarUrl: player.avatar_url,
    }),
  );
  const regularRounds = rounds.filter((round) => round.round_kind === "regular");
  const publicRounds = regularRounds.filter((round) => round.is_visible);
  const penaltyStates = [
    ...new Set(penaltyEvents.map((event) => event.player_id)),
  ].map((playerId) => {
    const state = calculateSeasonPenalty(
      penaltyEvents
        .filter((event) => event.player_id === playerId)
        .map((event) => ({
          roundNumber: event.round_number,
          fires: event.fire_count,
        })),
      regularRounds.map((round) => round.round_number),
    );
    return { playerId, ...state };
  });
  const standingModifiers = {
    adjustments: pointAdjustments.map((adjustment) => ({
      playerId: adjustment.player_id,
      amount: adjustment.amount,
      kind: adjustment.adjustment_kind,
    })),
    substitutions: substitutions.map((substitution) => ({
      matchId: substitution.match_id,
      outgoingPlayerId: substitution.outgoing_player_id,
      incomingPlayerId: substitution.incoming_player_id,
      incomingDotaId: substitution.incoming_dota_id,
      incomingNickname: substitution.incoming_nickname,
      incomingAvatarUrl: substitution.incoming_avatar_url,
      teamSide: substitution.team_side,
      technicalLoss: substitution.technical_loss,
    })),
    penalties: penaltyStates,
    participantStates: seasonPlayers.map((player) => ({
      playerId: player.discord_id,
      section: player.standings_section,
      inactiveReason: player.inactive_reason,
      rankSnapshot: player.rank_snapshot,
      standingsSnapshot: player.standings_snapshot,
    })),
  };
  const standings = calculateSeasonStandings(
    publicRounds.map((round) => ({
      id: round.id,
      roundNumber: round.round_number,
      isVisible: round.is_visible,
    })),
    standingMatches,
    standingPlayers,
    standingModifiers,
  );
  const previewStandings = isOrganizer
    ? calculateSeasonStandings(
        regularRounds.map((round) => ({
          id: round.id,
          roundNumber: round.round_number,
          isVisible: round.is_visible,
        })),
        standingMatches,
        standingPlayers,
        standingModifiers,
      )
    : null;

  return Response.json({
    generatedAt: generatedAt.toISOString(),
    rounds: nestedRounds,
    standings,
    previewStandings,
    participants: seasonPlayers,
    pointAdjustments: isOrganizer ? pointAdjustments : [],
    penaltyEvents: isOrganizer ? penaltyEvents : [],
    finalists: finalistsWithMedals,
    isOrganizer,
  });
}
