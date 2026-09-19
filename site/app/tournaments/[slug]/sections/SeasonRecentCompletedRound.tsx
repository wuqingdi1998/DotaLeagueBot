"use client";

import { AvatarImage } from "@/app/components/AvatarImage";
import { PlayerProfileServiceLogo } from "@/app/components/PlayerProfileServiceLogo";
import { PlayerStatisticsPopover } from "@/app/components/PlayerStatisticsPopover";
import {
  buildPlayerLinks,
  normalizeDotaAccountId,
} from "@/lib/player-links";
import type {
  SeasonMatch,
  SeasonMatchParticipant,
  SeasonRound,
} from "../model/season-types";

export function SeasonRecentCompletedRound({
  onOpenMatch,
  round,
}: {
  onOpenMatch: (roundNumber: number, matchId: number) => void;
  round: SeasonRound;
}) {
  const matches = round.lobbies
    .toSorted((left, right) => left.sort_order - right.sort_order)
    .flatMap((lobby) => lobby.matches);
  return (
    <div className="season-recent-round">
      <header>
        <strong>Тур {round.round_number}</strong>
        <span>Все лобби завершены</span>
      </header>
      {matches.map((match) => (
        <SeasonRecentMatch
          key={match.id}
          match={match}
          onOpen={() => onOpenMatch(round.round_number, match.id)}
        />
      ))}
    </div>
  );
}

function SeasonRecentMatch({
  match,
  onOpen,
}: {
  match: SeasonMatch;
  onOpen: () => void;
}) {
  return (
    <article className="season-recent-match">
      <button
        className="season-recent-match-heading"
        type="button"
        onClick={onOpen}
      >
        <strong>{match.lobby_name}</strong>
        <span>Открыть матч</span>
      </button>
      <div className="season-recent-match-teams">
        <SeasonRecentTeam
          name={match.team_a_name}
          players={match.participants.filter(
            (player) => player.team_side === "a",
          )}
          score={match.team_a_score}
          isWinner={match.result === "team_a"}
        />
        <SeasonRecentTeam
          name={match.team_b_name}
          players={match.participants.filter(
            (player) => player.team_side === "b",
          )}
          score={match.team_b_score}
          isWinner={match.result === "team_b"}
        />
      </div>
    </article>
  );
}

function SeasonRecentTeam({
  isWinner,
  name,
  players,
  score,
}: {
  isWinner: boolean;
  name: string;
  players: SeasonMatchParticipant[];
  score: number | null;
}) {
  const orderedPlayers = players
    .toSorted(
      (left, right) =>
        (left.slot_number ?? 99) - (right.slot_number ?? 99),
    )
    .slice(0, 5);
  return (
    <section className={`season-recent-team${isWinner ? " winner" : ""}`}>
      <header>
        <strong>{name}</strong>
        <b>{score ?? "–"}</b>
      </header>
      <div className="season-recent-team-players">
        {orderedPlayers.map((player) => (
          <SeasonRecentPlayer key={player.player_id} player={player} />
        ))}
      </div>
    </section>
  );
}

function SeasonRecentPlayer({ player }: { player: SeasonMatchParticipant }) {
  const dotaId = normalizeDotaAccountId(player.dota_id);
  const avatar = (
    <AvatarImage
      className="season-recent-player-avatar-image"
      source={player.avatar_url}
      alt=""
      width={48}
      height={48}
      unoptimized
      fallback={
        <span className="season-recent-player-avatar-image fallback">
          {player.nickname.slice(0, 1).toUpperCase()}
        </span>
      }
    />
  );
  if (!dotaId) {
    return (
      <span
        className="season-recent-player-avatar unavailable"
        title={`${player.nickname}: профиль не привязан`}
      >
        {avatar}
      </span>
    );
  }
  const links = buildPlayerLinks(dotaId);
  return (
    <div className="season-recent-player">
      <a
        className="season-recent-service-link stratz"
        href={links.stratz}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`STRATZ: ${player.nickname}`}
        title={`Открыть STRATZ – ${player.nickname}`}
      >
        <PlayerProfileServiceLogo
          className="season-recent-service-logo"
          service="stratz"
        />
      </a>
      <PlayerStatisticsPopover
        anchorClassName="season-recent-player-avatar"
        dotaId={dotaId}
        nickname={player.nickname}
        profileHref={`/players/${dotaId}`}
      >
        {avatar}
      </PlayerStatisticsPopover>
      <a
        className="season-recent-service-link dotabuff"
        href={links.dotabuff}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Dotabuff: ${player.nickname}`}
        title={`Открыть Dotabuff – ${player.nickname}`}
      >
        <PlayerProfileServiceLogo
          className="season-recent-service-logo"
          service="dotabuff"
        />
      </a>
    </div>
  );
}
