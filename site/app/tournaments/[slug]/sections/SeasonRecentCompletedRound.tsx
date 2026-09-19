"use client";

import { AvatarImage } from "@/app/components/AvatarImage";
import { PlayerProfileServiceLogo } from "@/app/components/PlayerProfileServiceLogo";
import { PlayerStatisticsPopover } from "@/app/components/PlayerStatisticsPopover";
import { normalizeDotaAccountId } from "@/lib/player-links";
import { seasonMatchLinks } from "@/lib/season";
import type {
  SeasonGame,
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
        <strong>
          {round.round_kind === "finals"
            ? (round.name ?? "Финалы")
            : `Тур ${round.round_number}`}
        </strong>
        <span>
          {round.round_kind === "finals"
            ? "Все финальные матчи завершены"
            : "Все лобби завершены"}
        </span>
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
      <header className="season-recent-match-heading">
        <button type="button" onClick={onOpen}>
          <strong>{match.lobby_name}</strong>
          <span>Открыть матч</span>
        </button>
        <SeasonRecentMapLinks games={match.games} bestOf={match.best_of} />
      </header>
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

function SeasonRecentMapLinks({
  bestOf,
  games,
}: {
  bestOf: number;
  games: SeasonGame[];
}) {
  return (
    <nav className="season-recent-map-links" aria-label="Ссылки на карты">
      {Array.from({ length: bestOf }, (_, index) => index + 1).map(
        (gameNumber) => {
          const game = games.find((item) => item.game_number === gameNumber);
          const links = game?.dota_match_id
            ? seasonMatchLinks(game.dota_match_id)
            : null;
          return (
            <span className="season-recent-map-link-group" key={gameNumber}>
              <b>{game?.game_number ?? gameNumber}</b>
              <SeasonRecentMapServiceLink
                href={links?.stratz ?? null}
                gameNumber={gameNumber}
                service="stratz"
              />
              <SeasonRecentMapServiceLink
                href={links?.dotaBuff ?? null}
                gameNumber={gameNumber}
                service="dotabuff"
              />
            </span>
          );
        },
      )}
    </nav>
  );
}

function SeasonRecentMapServiceLink({
  gameNumber,
  href,
  service,
}: {
  gameNumber: number;
  href: string | null;
  service: "stratz" | "dotabuff";
}) {
  const label = service === "stratz" ? "STRATZ" : "Dotabuff";
  const logo = (
    <PlayerProfileServiceLogo
      className="season-recent-map-logo"
      service={service}
    />
  );
  if (!href) {
    return (
      <span
        className={`season-recent-map-link ${service} unavailable`}
        aria-label={`${label}, карта ${gameNumber}: ссылка недоступна`}
        title="Ссылка на карту ещё не добавлена"
      >
        {logo}
      </span>
    );
  }
  return (
    <a
      className={`season-recent-map-link ${service}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}, карта ${gameNumber}`}
      title={`Открыть карту ${gameNumber} в ${label}`}
    >
      {logo}
    </a>
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
  return (
    <PlayerStatisticsPopover
      anchorClassName="season-recent-player-avatar"
      dotaId={dotaId}
      nickname={player.nickname}
      profileHref={`/players/${dotaId}`}
    >
      {avatar}
    </PlayerStatisticsPopover>
  );
}
