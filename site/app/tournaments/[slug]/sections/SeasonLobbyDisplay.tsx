"use client";

import Image from "next/image";
import Link from "next/link";
import { FiCalendar, FiExternalLink, FiLayers, FiLogIn, FiUsers } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import { seasonMatchLinks } from "@/lib/season";
import { groupSeasonFinalMedalists } from "@/lib/season-finals";
import { formatDayMonth, formatTime } from "../model/formatters";
import { seasonLobbyStatusLabel } from "../model/season-labels";
import type { SeasonMatch, SeasonRound } from "../model/season-types";
import type { ReactNode } from "react";

export function SeasonLobbyList({
  lobbyFooter,
  participantAction,
  round,
  isArchived,
}: {
  lobbyFooter?: (lobby: SeasonRound["lobbies"][number]) => ReactNode;
  participantAction?: (
    match: SeasonMatch,
    player: SeasonMatch["participants"][number],
  ) => ReactNode;
  round: SeasonRound;
  isArchived: boolean;
}) {
  if (!round.lobbies.length) {
    return (
      <div className="empty-standings">
        {isArchived && round.round_kind === "regular"
          ? "Составы лобби этого тура не сохранились. Результаты участников перенесены в таблицу сезона."
          : "В этом туре пока нет опубликованных лобби."}
      </div>
    );
  }
  return (
    <div className="season-lobby-list season-published-lobbies">
      {round.lobbies.map((lobby) => (
        <section className="season-lobby-card" key={lobby.id}>
          <header className="season-lobby-header">
            <div className="season-lobby-title">
              <span>{lobby.sort_order}</span>
              <div>
                <p>Игровое лобби</p>
                <h4>{lobby.name}</h4>
              </div>
            </div>
            <b className={`season-status-pill ${lobby.status}`}>
              {seasonLobbyStatusLabel(lobby.status)}
            </b>
          </header>
          {!lobby.matches.length ? (
            <p className="season-empty-copy">Матчи лобби ещё не опубликованы.</p>
          ) : (
            <div className="season-match-list">
              {lobby.matches.map((match) => (
                <SeasonMatchCard
                  match={match}
                  participantAction={participantAction}
                  key={match.id}
                />
              ))}
            </div>
          )}
          {lobbyFooter?.(lobby)}
        </section>
      ))}
    </div>
  );
}

function SeasonMatchCard({
  match,
  participantAction,
}: {
  match: SeasonMatch;
  participantAction?: (
    match: SeasonMatch,
    player: SeasonMatch["participants"][number],
  ) => ReactNode;
}) {
  const teamA = match.participants.filter((player) => player.team_side === "a");
  const teamB = match.participants.filter((player) => player.team_side === "b");
  return (
    <article className="season-match-card" id={`season-match-${match.id}`}>
      <div className="season-match-heading">
        <div>
          <span>
            <FiCalendar aria-hidden="true" />
            {match.scheduled_at
              ? <time dateTime={match.scheduled_at}>
                  {formatDayMonth(match.scheduled_at)} ·{" "}
                  {formatTime(match.scheduled_at)}
                </time>
              : "Время не назначено"}
          </span>
          <span>
            <FiLayers aria-hidden="true" /> BO{match.best_of}
          </span>
        </div>
      </div>
      <div className="season-match-scoreboard">
        <SeasonTemporaryTeam
          match={match}
          name={match.team_a_name}
          players={teamA}
          participantAction={participantAction}
        />
        <div className="season-match-score">
          <span>Счёт матча</span>
          <strong>
            <b className={match.result === "team_a" ? "winner" : ""}>
              {match.team_a_score ?? "—"}
            </b>
            <i>:</i>
            <b className={match.result === "team_b" ? "winner" : ""}>
              {match.team_b_score ?? "—"}
            </b>
          </strong>
          <small>BO{match.best_of}</small>
        </div>
        <SeasonTemporaryTeam
          match={match}
          name={match.team_b_name}
          players={teamB}
          participantAction={participantAction}
        />
      </div>
      {match.can_enter_lobby && (
        <Link className="season-enter-lobby-button" href={`/season-lobby/${match.id}`}>
          <FiLogIn aria-hidden="true" /> Войти в лобби
        </Link>
      )}
      {match.result && (
        <p className={`season-match-outcome ${match.result}`}>
          {match.result === "draw"
            ? "Матч завершился вничью"
            : `Победитель: ${
                match.result === "team_a"
                  ? match.team_a_name
                  : match.team_b_name
              }`}
        </p>
      )}
      {match.substitutions.length > 0 && (
        <section className="season-substitutions">
          <h5>Замены по ходу матча</h5>
          {match.substitutions.map((substitution) => (
            <p key={substitution.id}>
              {substitution.game_number
                ? `Карта ${substitution.game_number}: `
                : ""}
              <PlayerProfileLink
                className="season-player-profile-link"
                dotaId={substitution.outgoing_dota_id}
                nickname={substitution.outgoing_nickname}
              />
              {" заменён на "}
              <PlayerProfileLink
                className="season-player-profile-link"
                dotaId={substitution.incoming_dota_id}
                nickname={substitution.incoming_nickname}
              />
              {substitution.note ? ` · ${substitution.note}` : ""}
            </p>
          ))}
        </section>
      )}
      <div className="season-game-list">
        {match.games.map((game) => {
          const links = game.dota_match_id
            ? seasonMatchLinks(game.dota_match_id)
            : null;
          return (
            <div key={game.id}>
              <span>
                Карта {game.game_number}
                {game.duration_seconds
                  ? ` · ${Math.floor(game.duration_seconds / 60)} мин`
                  : ""}
              </span>
              {game.dota_match_id && <code>{game.dota_match_id}</code>}
              {links && (
                <nav aria-label={`Ссылки карты ${game.game_number}`}>
                  <a href={links.dotaBuff} target="_blank" rel="noopener noreferrer">
                    DotaBuff <FiExternalLink aria-hidden="true" />
                  </a>
                  <a href={links.stratz} target="_blank" rel="noopener noreferrer">
                    Stratz <FiExternalLink aria-hidden="true" />
                  </a>
                </nav>
              )}
            </div>
          );
        })}
        {!match.games.length && (
          <p className="season-empty-copy">Карты ещё не добавлены.</p>
        )}
      </div>
    </article>
  );
}

export function SeasonFinalistsSummary({ round }: { round: SeasonRound }) {
  const medalGroups = groupSeasonFinalMedalists(
    round.lobbies.flatMap((lobby) =>
      lobby.matches.map((match) => ({
        id: match.id,
        lobbyName: lobby.name,
        lobbyOrder: lobby.sort_order,
        status: match.status,
        result: match.result,
        teamAName: match.team_a_name,
        teamBName: match.team_b_name,
        participants: match.participants.map((player) => ({
          ...player,
          playerId: player.player_id,
          teamSide: player.team_side,
        })),
      })),
    ),
  );
  const goldCount = medalGroups
    .filter((group) => group.medal === "gold")
    .reduce((total, group) => total + group.players.length, 0);
  const silverCount = medalGroups
    .filter((group) => group.medal === "silver")
    .reduce((total, group) => total + group.players.length, 0);

  return (
    <section className="season-finalists">
      <h4>Медалисты финалов</h4>
      <p className="season-empty-copy">
        Два финала 5×5 · золото {goldCount}/10 · серебро {silverCount}/10
      </p>
      {!medalGroups.length ? (
        <p className="season-empty-copy">
          Медалисты появятся после завершения финальных матчей.
        </p>
      ) : (
        <div className="season-medalist-groups">
          {medalGroups.map((group) => (
            <article
              className={`season-medalist-group ${group.medal}`}
              key={`${group.matchId}-${group.medal}`}
            >
              <header>
                <span aria-hidden="true">{group.medal === "gold" ? "🥇" : "🥈"}</span>
                <div>
                  <small>
                    {group.medal === "gold" ? "Победители" : "Финалисты"} ·{" "}
                    {group.lobbyName}
                  </small>
                  <strong>{group.teamName}</strong>
                </div>
              </header>
              <ul>
                {group.players.map((player) => (
                  <li key={player.player_id}>
                    <PlayerProfileLink
                      className="season-finalist-player-link"
                      dotaId={player.dota_id}
                      nickname={player.nickname}
                    >
                      {player.nickname}
                    </PlayerProfileLink>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SeasonTemporaryTeam({
  match,
  name,
  players,
  participantAction,
}: {
  match: SeasonMatch;
  name: string;
  players: SeasonMatch["participants"];
  participantAction?: (
    match: SeasonMatch,
    player: SeasonMatch["participants"][number],
  ) => ReactNode;
}) {
  const recordedTiers = players
    .map((player) => player.tier_snapshot)
    .filter((tier): tier is number => tier !== null);
  const tierTotal = recordedTiers.reduce((total, tier) => total + tier, 0);
  return (
    <section className="season-temporary-team">
      <header>
        <FiUsers aria-hidden="true" />
        <h5>{name}</h5>
        <span className="season-team-tier-total">
          <small>Сумма тиров</small>
          <strong>{recordedTiers.length ? tierTotal : "—"}</strong>
        </span>
      </header>
      <ul>
        {players.map((player) => (
          <li key={player.player_id}>
            {player.avatar_url ? (
              <Image src={player.avatar_url} width={36} height={36} alt="" />
            ) : (
              <i>{player.nickname.slice(0, 1).toUpperCase()}</i>
            )}
            <span>
              <PlayerProfileLink
                className="season-player-profile-link"
                dotaId={player.dota_id}
                nickname={player.nickname}
              >
                <strong>{player.nickname}</strong>
              </PlayerProfileLink>
              {player.is_captain && <small>Капитан</small>}
            </span>
            <span className="season-player-row-actions">
              {participantAction?.(match, player)}
              <small className="player-tier">тир {player.tier_snapshot ?? "—"}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
