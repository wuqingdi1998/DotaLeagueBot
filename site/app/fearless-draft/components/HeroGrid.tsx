"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { FiCheck, FiLock, FiSearch, FiSlash } from "react-icons/fi";
import {
  FEARLESS_DRAFT_HEROES,
  HERO_ATTRIBUTE_GROUPS,
  sortHeroesAlphabetically,
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

type DraftHero = (typeof FEARLESS_DRAFT_HEROES)[number];

type HeroPreview = {
  hero: DraftHero;
  left: number;
  top: number;
};

const LATEST_ACTION_FLASH_DURATION_MS = 3_000;

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
  const [heroPreview, setHeroPreview] = useState<HeroPreview | null>(null);
  const [flashingAction, setFlashingAction] = useState<{
    heroId: number;
    type: "PICK" | "BAN";
  } | null>(null);
  const latestAction = map.actions.at(-1);
  const latestActionHeroId = latestAction?.heroId;
  const latestActionType = latestAction?.type;
  const latestActionSignature = `${map.id}:${latestAction?.step ?? -1}`;
  const previousActionSignature = useRef(latestActionSignature);
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

  useEffect(() => {
    if (latestActionSignature === previousActionSignature.current) return;
    previousActionSignature.current = latestActionSignature;
    if (latestActionHeroId === null || latestActionHeroId === undefined) return;
    if (latestActionType === undefined) return;

    const showTimer = window.setTimeout(() => {
      setFlashingAction({ heroId: latestActionHeroId, type: latestActionType });
    }, 0);
    const hideTimer = window.setTimeout(
      () => setFlashingAction(null),
      LATEST_ACTION_FLASH_DURATION_MS,
    );
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [latestActionHeroId, latestActionSignature, latestActionType]);

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
      heroes: sortHeroesAlphabetically(
        visibleHeroes.filter((hero) => hero.primaryAttribute === group.key),
      ),
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

  function showHeroPreview(hero: DraftHero, event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const previewWidth = 180;
    const previewHeight = 190;
    const left = Math.min(
      Math.max(8, bounds.left + bounds.width / 2 - previewWidth / 2),
      window.innerWidth - previewWidth - 8,
    );
    const preferredTop = bounds.top - previewHeight - 8;
    const top = preferredTop >= 8
      ? preferredTop
      : Math.min(bounds.bottom + 8, window.innerHeight - previewHeight - 8);
    setHeroPreview({ hero, left, top });
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
                const flashClass = flashingAction?.heroId === hero.id
                  ? `just-${flashingAction.type.toLowerCase()}`
                  : "";
                return (
                  <button
                    key={hero.id}
                    className={`${state} ${selectedHeroId === hero.id ? "selected" : ""} ${flashClass}`}
                    type="button"
                    aria-disabled={!canSelect}
                    aria-label={hero.name}
                    tabIndex={canSelect ? 0 : -1}
                    title={
                      state === "fearless-locked"
                        ? "Использован на предыдущей карте"
                        : state === "captains-disabled"
                          ? "Временно недоступен в Captain's Mode"
                          : state === "banned"
                            ? "Забанен на текущей карте"
                            : hero.name
                    }
                    onMouseEnter={(event) => showHeroPreview(hero, event)}
                    onMouseLeave={() => setHeroPreview(null)}
                    onClick={() => {
                      if (canSelect) {
                        setSelection({ heroId: hero.id, version: map.version });
                      }
                    }}
                  >
                    <span className="fearless-hero-image">
                      <Image src={hero.portraitUrl} alt="" fill sizes="64px" unoptimized />
                      {state === "fearless-locked" && <FiLock />}
                      {state === "banned" && <FiSlash />}
                      {state.startsWith("picked") && <FiCheck />}
                    </span>
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
      {heroPreview && (
        <div
          className="fearless-hero-preview"
          role="tooltip"
          style={{ left: heroPreview.left, top: heroPreview.top }}
        >
          <span>
            <Image
              src={heroPreview.hero.portraitUrl}
              alt=""
              fill
              sizes="180px"
              unoptimized
            />
          </span>
          <strong>{heroPreview.hero.name}</strong>
        </div>
      )}
    </section>
  );
}
