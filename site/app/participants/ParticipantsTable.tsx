"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SiSteam } from "react-icons/si";
import { FiSearch, FiX } from "react-icons/fi";
import type { ParticipantDirectoryPlayer } from "@/lib/participants";

export function ParticipantsTable({
  players,
}: {
  players: ParticipantDirectoryPlayer[];
}) {
  const [search, setSearch] = useState("");
  const visiblePlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ru-RU");
    return players.filter((player) =>
      player.nickname.toLocaleLowerCase("ru-RU").includes(normalizedSearch),
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
          placeholder="Найти участника по никнейму"
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
        className="hall-table participants-table"
        role="table"
        aria-label="Список участников"
      >
        <div className="hall-row hall-head participants-row" role="row">
          <span role="columnheader">№</span>
          <span role="columnheader">Участник</span>
          <span role="columnheader">Тир</span>
          <span role="columnheader">Профили</span>
        </div>
        {visiblePlayers.map((player, index) => (
          <div
            className="hall-row participants-row"
            role="row"
            key={player.dotaId}
          >
            <strong role="cell">{index + 1}</strong>
            <Link
              className="hall-player participants-player"
              href={`/players/${player.dotaId}`}
              role="cell"
            >
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
            </Link>
            <span className="participant-tier" role="cell">
              {player.tier === null ? "—" : `Тир ${player.tier}`}
            </span>
            <span className="participant-links" role="cell">
              <a
                href={player.links.dotabuff}
                target="_blank"
                rel="noreferrer"
                aria-label={`Открыть Dotabuff игрока ${player.nickname}`}
                title="Dotabuff"
              >
                DB
              </a>
              <a
                href={player.links.stratz}
                target="_blank"
                rel="noreferrer"
                aria-label={`Открыть Stratz игрока ${player.nickname}`}
                title="Stratz"
              >
                S
              </a>
              <a
                href={player.links.steam}
                target="_blank"
                rel="noreferrer"
                aria-label={`Открыть Steam игрока ${player.nickname}`}
                title="Steam"
              >
                <SiSteam aria-hidden="true" />
              </a>
            </span>
          </div>
        ))}
        {!visiblePlayers.length && (
          <div className="hall-empty">
            По запросу «{search.trim()}» участники не найдены
          </div>
        )}
      </div>
    </>
  );
}
