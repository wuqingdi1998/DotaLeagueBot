"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArchive, FiEdit3, FiSearch, FiX } from "react-icons/fi";
import { PlayerServiceIcon } from "@/app/components/PlayerServiceIcon";
import {
  filterParticipantDirectory,
  type ParticipantTierOrder,
} from "@/lib/participant-filter";
import type { ParticipantDirectoryPlayer } from "@/lib/participants";
import { ParticipantAdminDialog } from "./ParticipantAdminDialog";

export function ParticipantsTable({
  players,
  isOrganizer,
  organizerDotaId,
}: {
  players: ParticipantDirectoryPlayer[];
  isOrganizer: boolean;
  organizerDotaId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<number | null>(null);
  const [tier, setTier] = useState<number | null>(null);
  const [tierOrder, setTierOrder] = useState<ParticipantTierOrder>("desc");
  const [showArchived, setShowArchived] = useState(false);
  const [showManualTiers, setShowManualTiers] = useState(false);
  const [editedPlayer, setEditedPlayer] =
    useState<ParticipantDirectoryPlayer | null>(null);

  const visiblePlayers = useMemo(() => {
    return filterParticipantDirectory(players, {
      search,
      role,
      tier,
      tierOrder,
      showArchived,
      showManualTiers,
    });
  }, [players, role, search, showArchived, showManualTiers, tier, tierOrder]);

  return (
    <>
      <div className="participant-toolbar">
        <label className="hall-search participant-search">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти участника или архивный ник"
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
        <label>
          <span>Роль</span>
          <select
            value={role ?? ""}
            onChange={(event) =>
              setRole(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Все роли</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option value={value} key={value}>
                Роль {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Тир</span>
          <select
            value={tier ?? ""}
            onChange={(event) =>
              setTier(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Все тиры</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (value) => (
                <option value={value} key={value}>
                  Тир {value}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          <span>Порядок тиров</span>
          <select
            value={tierOrder}
            onChange={(event) =>
              setTierOrder(event.target.value as ParticipantTierOrder)
            }
          >
            <option value="desc">От большего</option>
            <option value="asc">От меньшего</option>
          </select>
        </label>
        {isOrganizer && (
          <label className="participant-archive-toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => {
                setShowArchived(event.target.checked);
                if (event.target.checked) setShowManualTiers(false);
              }}
            />
            <FiArchive aria-hidden="true" />
            Показать только архивных
          </label>
        )}
        {isOrganizer && (
          <label className="participant-archive-toggle">
            <input
              type="checkbox"
              checked={showManualTiers}
              onChange={(event) => {
                setShowManualTiers(event.target.checked);
                if (event.target.checked) setShowArchived(false);
              }}
            />
            <FiEdit3 aria-hidden="true" />
            Показать ручные тиры
          </label>
        )}
      </div>

      <div
        className={`hall-table participants-table${isOrganizer ? " organizer" : ""}`}
        role="table"
        aria-label="Список участников"
      >
        <div className="hall-row hall-head participants-row" role="row">
          <span role="columnheader">№</span>
          <span role="columnheader">Участник</span>
          <span role="columnheader">Роли</span>
          <span role="columnheader">Тир</span>
          <span role="columnheader">Профили</span>
        </div>
        {visiblePlayers.map((player, index) => (
          <div
            className={`hall-row participants-row ${player.kind}`}
            role="row"
            key={`${player.kind}-${player.identityId}`}
          >
            <strong role="cell">{index + 1}</strong>
            <ParticipantIdentity player={player} />
            <span className="participant-roles" role="cell">
              {player.positions ?? "—"}
            </span>
            <ParticipantTierCell
              player={player}
              isOrganizer={isOrganizer}
              onEdit={() => setEditedPlayer(player)}
            />
            <ParticipantLinks player={player} />
          </div>
        ))}
        {!visiblePlayers.length && (
          <div className="hall-empty">
            Участники с выбранными условиями не найдены
          </div>
        )}
      </div>
      {editedPlayer && (
        <ParticipantAdminDialog
          player={editedPlayer}
          canArchive={editedPlayer.dotaId !== organizerDotaId}
          onClose={() => setEditedPlayer(null)}
        />
      )}
    </>
  );
}

function ParticipantTierCell({
  player,
  isOrganizer,
  onEdit,
}: {
  player: ParticipantDirectoryPlayer;
  isOrganizer: boolean;
  onEdit: () => void;
}) {
  const isOutdated = player.tierStatus !== "current";
  const value = isOutdated ? "!" : (player.tier ?? "—");
  const title = isOutdated
    ? "Ранг неактуален"
    : `Тир игрока ${player.nickname}`;
  return (
    <span className="participant-tier-cell" role="cell">
      {isOrganizer && player.tierStatus === "inactive" && (
        <span className="participant-inactive-badge">Инактив</span>
      )}
      {isOrganizer && player.kind === "registered" ? (
        <button
          className={`participant-tier editable${isOutdated ? " outdated" : ""}`}
          type="button"
          onClick={onEdit}
          title={isOutdated ? "Ранг неактуален" : `Изменить ${title.toLowerCase()}`}
          aria-label={isOutdated ? `Ранг игрока ${player.nickname} неактуален` : title}
        >
          {value}
        </button>
      ) : (
        <span
          className={`participant-tier${isOutdated ? " outdated" : ""}`}
          title={isOutdated ? "Ранг неактуален" : undefined}
        >
          {value}
        </span>
      )}
    </span>
  );
}

function ParticipantIdentity({
  player,
}: {
  player: ParticipantDirectoryPlayer;
}) {
  const content = (
    <>
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
      <span>
        <b>{player.nickname}</b>
        {player.kind === "archive" && <small>Архивный профиль</small>}
      </span>
    </>
  );
  return player.kind === "registered" && player.dotaId ? (
    <Link
      className="hall-player participants-player"
      href={`/players/${player.dotaId}`}
      role="cell"
    >
      {content}
    </Link>
  ) : (
    <Link
      className="hall-player participants-player archive"
      href={`/archive-players/${player.identityId}`}
      role="cell"
    >
      {content}
    </Link>
  );
}

function ParticipantLinks({
  player,
}: {
  player: ParticipantDirectoryPlayer;
}) {
  if (!player.links) {
    return (
      <span className="participant-links empty" role="cell">
        —
      </span>
    );
  }
  return (
    <span className="participant-links" role="cell">
      {(["dotabuff", "stratz", "steam"] as const).map((service) => (
        <a
          href={player.links?.[service]}
          target="_blank"
          rel="noreferrer"
          aria-label={`Открыть ${service} игрока ${player.nickname}`}
          title={service}
          key={service}
        >
          <PlayerServiceIcon service={service} />
        </a>
      ))}
    </span>
  );
}
