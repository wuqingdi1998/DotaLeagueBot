"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FaMedal } from "react-icons/fa";
import { FiSearch, FiX } from "react-icons/fi";
import type { HallOfFamePlayer } from "@/lib/player-profile";

export function HallOfFameTable({
  players,
}: {
  players: HallOfFamePlayer[];
}) {
  const [search, setSearch] = useState("");
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

      <div className="hall-table" role="table" aria-label="Медальный зачёт">
        <div className="hall-row hall-head" role="row">
          <span role="columnheader">Место</span>
          <span role="columnheader">Игрок</span>
          <span className="hall-medal-heading gold" role="columnheader">
            <FaMedal aria-hidden="true" />
            <b>Золото</b>
          </span>
          <span className="hall-medal-heading silver" role="columnheader">
            <FaMedal aria-hidden="true" />
            <b>Серебро</b>
          </span>
          <span className="hall-medal-heading bronze" role="columnheader">
            <FaMedal aria-hidden="true" />
            <b>Бронза</b>
          </span>
          <span role="columnheader">Всего</span>
        </div>
        {visiblePlayers.map(({ player, rank }) => {
          const total =
            player.medals.gold + player.medals.silver + player.medals.bronze;
          return (
            <Link
              className="hall-row"
              href={`/players/${player.dotaId}`}
              role="row"
              key={player.dotaId}
            >
              <strong role="cell">{rank}</strong>
              <span className="hall-player" role="cell">
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
              <span className="hall-medal gold" role="cell">
                <FaMedal aria-hidden="true" /> {player.medals.gold}
              </span>
              <span className="hall-medal silver" role="cell">
                <FaMedal aria-hidden="true" /> {player.medals.silver}
              </span>
              <span className="hall-medal bronze" role="cell">
                <FaMedal aria-hidden="true" /> {player.medals.bronze}
              </span>
              <strong role="cell">{total}</strong>
            </Link>
          );
        })}
        {!visiblePlayers.length && (
          <div className="hall-empty">
            По запросу «{search.trim()}» игроки не найдены
          </div>
        )}
      </div>
    </>
  );
}
