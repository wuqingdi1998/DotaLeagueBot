"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type UIEvent,
} from "react";
import { FaMedal } from "react-icons/fa";
import { FiSearch, FiX } from "react-icons/fi";
import type {
  HallOfFameMedal,
  HallOfFamePlayer,
  HallOfFameTournament,
} from "@/lib/hall-of-fame";

const medalLabels: Record<HallOfFameMedal, string> = {
  gold: "Золото",
  silver: "Серебро",
  bronze: "Бронза",
};

function syncSeasonScroll(
  event: UIEvent<HTMLDivElement>,
  targetRef: RefObject<HTMLDivElement | null>,
) {
  const target = targetRef.current;
  if (target && target.scrollLeft !== event.currentTarget.scrollLeft) {
    target.scrollLeft = event.currentTarget.scrollLeft;
  }
}

export function HallOfFameTable({
  players,
  tournaments,
}: {
  players: HallOfFamePlayer[];
  tournaments: HallOfFameTournament[];
}) {
  const [search, setSearch] = useState("");
  const seasonHeaderRef = useRef<HTMLDivElement>(null);
  const seasonBodyRef = useRef<HTMLDivElement>(null);
  const visiblePlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ru-RU");
    return players
      .map((player, index) => ({ player, rank: index + 1 }))
      .filter(({ player }) =>
        player.nickname
          .toLocaleLowerCase("ru-RU")
          .includes(normalizedSearch),
      );
  }, [players, search]);

  return (
    <>
      <label className="hall-search">
        <FiSearch aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Найти игрока по никнейму"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Очистить поиск"
          >
            <FiX aria-hidden="true" />
          </button>
        )}
      </label>

      <div
        className="hall-table"
        role="region"
        aria-label="Медальный зачёт"
        style={{ "--hall-season-count": tournaments.length } as CSSProperties}
      >
        <div className="hall-player-panel">
          <div className="hall-player-row hall-panel-head hall-head">
            <span>Место</span>
            <span>Игрок</span>
          </div>
          {visiblePlayers.map(({ player, rank }) => {
            const playerContent = (
              <>
                <strong>{rank}</strong>
                <span className="hall-player">
                  {player.avatarUrl ? (
                    <Image
                      src={player.avatarUrl}
                      alt=""
                      width={46}
                      height={46}
                      unoptimized
                    />
                  ) : (
                    <i>{player.nickname.slice(0, 1).toUpperCase()}</i>
                  )}
                  <b>{player.nickname}</b>
                </span>
              </>
            );
            return player.isArchive || !player.dotaId ? (
              <div
                className="hall-player-row hall-panel-row hall-archive-row"
                key={player.identityId}
              >
                {playerContent}
              </div>
            ) : (
              <Link
                className="hall-player-row hall-panel-row"
                href={`/players/${player.dotaId}`}
                key={player.identityId}
              >
                {playerContent}
              </Link>
            );
          })}
        </div>

        <div className="hall-season-panel">
          <div
            className="hall-season-header-scroll"
            ref={seasonHeaderRef}
            onScroll={(event) => syncSeasonScroll(event, seasonBodyRef)}
            tabIndex={0}
            aria-label="Прокрутка сезонных турниров"
          >
            <div className="hall-season-row hall-panel-head hall-head">
              {tournaments.map((tournament) => (
                <Link
                  className="hall-season-tournament"
                  href={`/tournaments/${tournament.slug}`}
                  title={tournament.name}
                  key={tournament.id}
                >
                  {tournament.name}
                </Link>
              ))}
            </div>
          </div>
          <div
            className="hall-season-body-scroll"
            ref={seasonBodyRef}
            onScroll={(event) => syncSeasonScroll(event, seasonHeaderRef)}
          >
            {visiblePlayers.map(({ player }) => (
              <div
                className="hall-season-row hall-panel-row"
                key={player.identityId}
              >
                {tournaments.map((tournament) => {
                  const medal = player.tournamentMedals[tournament.id];
                  return (
                    <span
                      className={`hall-season-medal ${medal ?? "none"}`}
                      aria-label={`${tournament.name}: ${medal ? medalLabels[medal] : "без медали"}`}
                      title={medal ? medalLabels[medal] : "Без медали"}
                      key={tournament.id}
                    >
                      {medal ? <FaMedal aria-hidden="true" /> : "—"}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="hall-totals-panel">
          <div className="hall-totals-row hall-panel-head hall-head">
            <span className="hall-medal-heading gold">
              <FaMedal aria-hidden="true" />
              <b>Золото</b>
            </span>
            <span className="hall-medal-heading silver">
              <FaMedal aria-hidden="true" />
              <b>Серебро</b>
            </span>
            <span className="hall-medal-heading bronze">
              <FaMedal aria-hidden="true" />
              <b>Бронза</b>
            </span>
          </div>
          {visiblePlayers.map(({ player }) => (
            <div className="hall-totals-row hall-panel-row" key={player.identityId}>
              <span className="hall-medal gold">
                <FaMedal aria-hidden="true" /> {player.medals.gold}
              </span>
              <span className="hall-medal silver">
                <FaMedal aria-hidden="true" /> {player.medals.silver}
              </span>
              <span className="hall-medal bronze">
                <FaMedal aria-hidden="true" /> {player.medals.bronze}
              </span>
            </div>
          ))}
        </div>

        {!visiblePlayers.length && (
          <div className="hall-empty">
            По запросу «{search.trim()}» игроки не найдены
          </div>
        )}
      </div>
    </>
  );
}
