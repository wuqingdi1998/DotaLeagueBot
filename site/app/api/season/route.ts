import { getSession } from "@/lib/auth";
import { one, query } from "@/lib/db";
import {
  calculateSeasonStandings,
  type SeasonStandingIdentity,
  type SeasonStandingMatch,
} from "@/lib/season";
import { calculateSeasonPenalty } from "@/lib/season-discipline";
import { loadSeasonExtras } from "./season-extra-query";

export const dynamic = "force-dynamic";

type RoundRow = {
  id: number;
  tournament_id: number;
  round_number: number;
  name: string | null;
  status: "planned" | "active" | "completed" | "cancelled";
  scheduled_at: string | null;
  is_visible: boolean;
  round_kind: "regular" | "finals";
  lobby_count: number;
  played_match_count: number;
};

type LobbyRow = {
  id: number;
  round_id: number;
  name: string;
  sort_order: number;
  status: "draft" | "scheduled" | "live" | "completed" | "cancelled";
  scheduled_at: string | null;
};

type MatchRow = {
  id: number;
  lobby_id: number;
  round_id: number;
  round_number: number;
  lobby_name: string;
  scheduled_at: string | null;
  team_a_name: string;
  team_b_name: string;
  best_of: number;
  team_a_score: number | null;
  team_b_score: number | null;
  result: "team_a" | "draw" | "team_b" | null;
  status: "draft" | "published" | "completed" | "cancelled";
  sort_order: number;
};

type ParticipantRow = {
  match_id: number;
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  team_side: "a" | "b";
  is_captain: boolean;
};

type GameRow = {
  id: number;
  match_id: number;
  game_number: number;
  dota_match_id: string | null;
  winner_side: "a" | "draw" | "b" | null;
  duration_seconds: number | null;
  status: "draft" | "published" | "completed" | "cancelled";
};

type SeasonPlayerRow = {
  discord_id: string;
  nickname: string;
  avatar_url: string | null;
  standings_section: "active" | "inactive";
  inactive_reason: string | null;
};

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
  }>(
    `SELECT id::int, tournament_type
     FROM tournaments
     WHERE slug = $1 ${isOrganizer ? "" : "AND status <> 'draft'"}`,
    [slug],
  );
  if (!tournament || tournament.tournament_type !== "seasonal") {
    return Response.json({ error: "Сезонный турнир не найден" }, { status: 404 });
  }

  const visibility = isOrganizer ? "" : "AND round.is_visible = TRUE";
  const matchVisibility = isOrganizer
    ? ""
    : "AND match.status IN ('published', 'completed')";
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
    [pointAdjustments, penaltyEvents, substitutions, finalists],
  ] =
    await Promise.all([
      query<RoundRow>(
        `SELECT round.id::int, round.tournament_id::int,
           round.round_number::int, round.name, round.status,
           round.scheduled_at, round.is_visible, round.round_kind,
           COUNT(DISTINCT lobby.id)::int AS lobby_count,
           COUNT(DISTINCT match.id) FILTER (
             WHERE match.status = 'completed'
           )::int AS played_match_count
         FROM season_rounds round
         LEFT JOIN season_lobbies lobby ON lobby.round_id = round.id
         LEFT JOIN season_matches match ON match.lobby_id = lobby.id
         WHERE round.tournament_id = $1 ${visibility}
         GROUP BY round.id
         ORDER BY round.round_number`,
        [tournament.id],
      ),
      query<LobbyRow>(
        `SELECT lobby.id::int, lobby.round_id::int, lobby.name,
           lobby.sort_order, lobby.status, lobby.scheduled_at
         FROM season_lobbies lobby
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility}
         ORDER BY round.round_number, lobby.sort_order, lobby.id`,
        [tournament.id],
      ),
      query<MatchRow>(
        `SELECT match.id::int, match.lobby_id::int, round.id::int AS round_id,
           round.round_number::int, lobby.name AS lobby_name,
           match.scheduled_at, match.team_a_name, match.team_b_name,
           match.best_of::int, match.team_a_score::int,
           match.team_b_score::int, match.result, match.status,
           match.sort_order
         FROM season_matches match
         JOIN season_lobbies lobby ON lobby.id = match.lobby_id
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility} ${matchVisibility}
         ORDER BY round.round_number, lobby.sort_order, match.sort_order`,
        [tournament.id],
      ),
      query<ParticipantRow>(
        `SELECT participant.match_id::int, participant.player_id::text,
           player.ingame_name AS nickname, player.avatar_url,
           participant.team_side, participant.is_captain
         FROM season_match_participants participant
         JOIN players player ON player.discord_id = participant.player_id
         JOIN season_matches match ON match.id = participant.match_id
         JOIN season_lobbies lobby ON lobby.id = match.lobby_id
         JOIN season_rounds round ON round.id = lobby.round_id
         WHERE round.tournament_id = $1 ${visibility} ${matchVisibility}
         ORDER BY participant.match_id, participant.team_side, player.ingame_name`,
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
        `SELECT player.discord_id::text, player.ingame_name AS nickname,
           player.avatar_url, participant.standings_section,
           participant.inactive_reason
         FROM season_participants participant
         JOIN players player ON player.discord_id = participant.player_id
         WHERE participant.tournament_id = $1
           ${isOrganizer ? "" : `AND (
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
         ORDER BY player.ingame_name`,
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
  const nestedRounds = rounds.map((round) => ({
    ...round,
    lobbies: nestedLobbies.filter((lobby) => lobby.round_id === round.id),
  }));

  const standingMatches: SeasonStandingMatch[] = nestedMatches.map((match) => ({
    id: match.id,
    roundId: match.round_id,
    status: match.status,
    result: match.result,
    participants: match.participants.map((participant) => ({
      playerId: participant.player_id,
      nickname: participant.nickname,
      avatarUrl: participant.avatar_url,
      teamSide: participant.team_side,
    })),
  }));
  const standingPlayers: SeasonStandingIdentity[] = seasonPlayers.map(
    (player) => ({
      playerId: player.discord_id,
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
    })),
    substitutions: substitutions.map((substitution) => ({
      matchId: substitution.match_id,
      outgoingPlayerId: substitution.outgoing_player_id,
      incomingPlayerId: substitution.incoming_player_id,
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
    generatedAt: new Date().toISOString(),
    rounds: nestedRounds,
    standings,
    previewStandings,
    participants: seasonPlayers,
    pointAdjustments: isOrganizer ? pointAdjustments : [],
    penaltyEvents: isOrganizer ? penaltyEvents : [],
    finalists,
    isOrganizer,
  });
}
