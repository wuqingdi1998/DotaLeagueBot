"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FiCheck, FiLock, FiSearch, FiSlash } from "react-icons/fi";
import {
  FEARLESS_DRAFT_HEROES,
  HERO_ATTRIBUTE_GROUPS,
} from "../model/heroes";
import type {
  DraftMapSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";

type HeroState =
  | "available"
  | "picked-radiant"
  | "picked-dire"
  | "banned"
  | "fearless-locked"
  | "captains-disabled";

export function HeroGrid({
  map,
  userId,
  isSending,
  send,
}: {
  map: DraftMapSnapshot;
  userId: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<{
    heroId: number;
    version: number;
  } | null>(null);
  const actionByHero = useMemo(
    () => new Map(map.actions.flatMap((action) =>
      action.heroId === null ? [] : [[action.heroId, action] as const],
    )),
    [map.actions],
  );
  const unavailable = useMemo(
    () => new Set(map.unavailableHeroIds),
    [map.unavailableHeroIds],
  );
  const selectedHeroId = selection?.version === map.version
    ? selection.heroId
    : null;
  const selectedHero = FEARLESS_DRAFT_HEROES.find((hero) => hero.id === selectedHeroId);
  const isOwnTurn = map.currentActorId === userId;

  const visibleHeroes = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("ru");
    return needle
      ? FEARLESS_DRAFT_HEROES.filter((hero) =>
          hero.name.toLocaleLowerCase("en").includes(needle) ||
          hero.key.toLocaleLowerCase("en").includes(needle),
        )
      : FEARLESS_DRAFT_HEROES;
  }, [search]);
  const groupedHeroes = useMemo(
    () => HERO_ATTRIBUTE_GROUPS.map((group) => ({
      ...group,
      heroes: visibleHeroes.filter((hero) => hero.primaryAttribute === group.key),
    })),
    [visibleHeroes],
  );

  function heroState(heroId: number): HeroState {
    const hero = FEARLESS_DRAFT_HEROES.find((candidate) => candidate.id === heroId);
    if (!hero?.isCaptainModeEnabled) return "captains-disabled";
    if (unavailable.has(heroId)) return "fearless-locked";
    const action = actionByHero.get(heroId);
    if (!action) return "available";
    if (action.type === "BAN") return "banned";
    return action.actorId === map.radiantPlayerId ? "picked-radiant" : "picked-dire";
  }

  return (
    <section className="fearless-hero-pool">
      <div className="fearless-hero-toolbar">
        <div>
          <span>HERO POOL</span>
          <strong>{visibleHeroes.length} героев</strong>
        </div>
        <label>
          <FiSearch />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти героя…"
          />
        </label>
      </div>
      <div className="fearless-hero-grid">
        {groupedHeroes.map((group) => (
          <section className={`fearless-attribute-group ${group.key}`} key={group.key}>
            <header><i /> <strong>{group.label}</strong></header>
            <div>
              {group.heroes.map((hero) => {
                const state = heroState(hero.id);
                const canSelect = isOwnTurn && state === "available";
                return (
                  <button
                    key={hero.id}
                    className={`${state} ${selectedHeroId === hero.id ? "selected" : ""}`}
                    type="button"
                    disabled={!canSelect}
                    title={
                      state === "fearless-locked"
                        ? "Использован на предыдущей карте"
                        : state === "captains-disabled"
                          ? "Временно недоступен в Captain's Mode"
                          : state === "banned"
                            ? "Забанен на текущей карте"
                            : hero.name
                    }
                    onClick={() => setSelection({ heroId: hero.id, version: map.version })}
                  >
                    <span className="fearless-hero-image">
                      <Image src={hero.imageUrl} alt="" fill sizes="64px" unoptimized />
                      {state === "fearless-locked" && <FiLock />}
                      {state === "banned" && <FiSlash />}
                      {state.startsWith("picked") && <FiCheck />}
                    </span>
                    <strong>{hero.name}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {selectedHero && (
        <div className="fearless-hero-confirm">
          <Image src={selectedHero.imageUrl} alt="" width={176} height={99} unoptimized />
          <div>
            <span>Выбран герой</span>
            <strong>{selectedHero.name}</strong>
          </div>
          <button
            className={map.currentAction === "BAN" ? "ban" : "pick"}
            type="button"
            disabled={isSending}
            onClick={() => void send({
              action: "SELECT_HERO",
              heroId: selectedHero.id,
              expectedVersion: map.version,
            })}
          >
            {map.currentAction === "BAN" ? "BAN HERO" : "PICK HERO"}
          </button>
        </div>
      )}
    </section>
  );
}
