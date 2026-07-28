"use client";

import { useMemo } from "react";
import {
  FiCalendar,
  FiExternalLink,
  FiLayers,
  FiUsers,
} from "react-icons/fi";
import Image from "next/image";
import { seasonMatchLinks } from "@/lib/season";
import { useTournament } from "../hooks/TournamentContext";
import { formatDayMonth, formatTime } from "../model/formatters";
import {
  seasonLobbyStatusLabel,
  seasonMatchStatusLabel,
} from "../model/season-labels";
import type { SeasonMatch } from "../model/season-types";

export function SeasonRoundPanel() {
  const { activeTab, data, season } = useTournament();
  const round = useMemo(
    () =>
      season.data?.rounds.find(
        (item) => item.round_number === season.activeRoundNumber,
      ),
    [season.activeRoundNumber, season.data?.rounds],
  );
  if (
    !data ||
    data.tournament.tournament_type !== "seasonal" ||
    activeTab !== "round"
  ) {
    return null;
  }
  if (!season.data || !round) return <SeasonLoadState />;

  return (
    <div className="tab-panel season-round-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">
            {round.round_kind === "finals"
              ? "Финальный этап"
              : `Тур ${round.round_number}`}
          </p>
          <h3>
            {round.name ||
              (round.round_kind === "finals"
                ? "Финалы"
                : `Тур ${round.round_number}`)}
          </h3>
          <p className="season-round-meta">
            {round.scheduled_at
              ? `${formatDayMonth(round.scheduled_at)} · ${formatTime(round.scheduled_at)}`
              : "Дата пока не назначена"}
          </p>
        </div>
      </div>
      {round.round_kind === "finals" && <SeasonFinalistsSummary />}
      {!round.lobbies.length ? (
        <div className="empty-standings">В этом туре пока нет лобби.</div>
      ) : (
        <div className="season-lobby-list">
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
                <p className="season-empty-copy">
                  Матчи лобби ещё не опубликованы.
                </p>
              ) : (
                <div className="season-match-list">
                  {lobby.matches.map((match) => (
                    <SeasonMatchCard match={match} key={match.id} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SeasonMatchCard({ match }: { match: SeasonMatch }) {
  const teamA = match.participants.filter((player) => player.team_side === "a");
  const teamB = match.participants.filter((player) => player.team_side === "b");
  return (
    <article className="season-match-card" id={`season-match-${match.id}`}>
      <div className="season-match-heading">
        <div>
          <span>
            <FiCalendar aria-hidden="true" />
            {match.scheduled_at
              ? `${formatDayMonth(match.scheduled_at)} · ${formatTime(match.scheduled_at)}`
              : "Время не назначено"}
          </span>
          <span>
            <FiLayers aria-hidden="true" /> BO{match.best_of}
          </span>
        </div>
        <b className={`season-status-pill ${match.status}`}>
          {seasonMatchStatusLabel(match.status)}
        </b>
      </div>
      <div className="season-match-scoreboard">
        <SeasonTemporaryTeam name={match.team_a_name} players={teamA} />
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
        <SeasonTemporaryTeam name={match.team_b_name} players={teamB} />
      </div>
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
              {substitution.outgoing_nickname} заменён на{" "}
              {substitution.incoming_nickname}
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

function SeasonFinalistsSummary() {
  const { season } = useTournament();
  const finalists = season.data?.finalists ?? [];
  const goldCount = finalists.filter(
    (finalist) => finalist.medal === "gold",
  ).length;
  const silverCount = finalists.filter(
    (finalist) => finalist.medal === "silver",
  ).length;
  return (
    <section className="season-finalists">
      <h4>Участники финалов</h4>
      <p className="season-empty-copy">
        Два финала 5×5 · золото {goldCount}/10 · серебро {silverCount}/10
      </p>
      {!finalists.length ? (
        <p className="season-empty-copy">
          Организатор пока не опубликовал состав финалов.
        </p>
      ) : (
        <div className="season-finalist-list">
          {finalists.map((finalist) => (
            <article key={finalist.player_id}>
              <span>{finalist.seed ? `#${finalist.seed}` : "—"}</span>
              <strong>{finalist.nickname}</strong>
              <b title={finalist.medal ?? "Медаль не определена"}>
                {finalist.medal === "gold"
                  ? "🥇"
                  : finalist.medal === "silver"
                    ? "🥈"
                    : ""}
              </b>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SeasonTemporaryTeam({
  name,
  players,
}: {
  name: string;
  players: SeasonMatch["participants"];
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
      {players.length ? (
        <ul>
          {players.map((player) => (
            <li key={player.player_id}>
              {player.avatar_url ? (
                <Image
                  src={player.avatar_url}
                  width={36}
                  height={36}
                  alt=""
                />
              ) : (
                <i>{player.nickname.slice(0, 1).toUpperCase()}</i>
              )}
              <span>
                <strong>{player.nickname}</strong>
                {player.is_captain && (
                  <small className="season-player-meta">Капитан</small>
                )}
              </span>
              {player.tier_snapshot !== null && (
                <small className="player-tier">
                  тир {player.tier_snapshot}
                </small>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="season-empty-lineup">Состав пока не заполнен</p>
      )}
    </section>
  );
}

function SeasonLoadState() {
  const { season } = useTournament();
  return (
    <div className="tab-panel empty-standings">
      {season.error ||
        (season.loading ? "Загружаем сезон…" : "Данные сезона пока недоступны")}
    </div>
  );
}
