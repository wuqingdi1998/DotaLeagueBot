"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { MouseEvent } from "react";
import { FiCheck, FiLock, FiSearch, FiSlash } from "react-icons/fi";
import {
  FEARLESS_DRAFT_HEROES,
  FEARLESS_DRAFT_HEROES_BY_ID,
  HERO_ATTRIBUTE_GROUPS,
  sortHeroesAlphabetically,
} from "../model/heroes";
import type {
  DraftMapSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";
import { useHeroSearchHotkeys } from "../hooks/useHeroSearchHotkeys";
import { useDraftLocale } from "../hooks/useDraftLocale";
import { draftTeamPlayerColor } from "../model/player-colors";

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

type HeroSuggestionFrameStyle = CSSProperties & {
  "--fearless-suggestion-glow": string;
};

type HeroSuggestionDashStyle = CSSProperties & {
  "--fearless-suggestion-dash-start": number;
  "--fearless-suggestion-dash-end": number;
};

const SUGGESTION_PATH_LENGTH = 140;
const SUGGESTION_DASH_LENGTH = 4;
const SUGGESTION_DASH_PERIOD = 7;

function HeroSuggestionFrame({ colors }: { colors: string[] }) {
  const frameStyle: HeroSuggestionFrameStyle = {
    "--fearless-suggestion-glow": colors[0],
  };
  const dashGap = SUGGESTION_DASH_PERIOD - SUGGESTION_DASH_LENGTH
    + SUGGESTION_DASH_PERIOD * (colors.length - 1);
  return (
    <span className="fearless-hero-suggestion-frame" style={frameStyle} aria-hidden="true">
      <svg width="100%" height="100%" focusable="false">
        {colors.map((color, index) => {
          const dashStart = -SUGGESTION_DASH_PERIOD * index;
          const dashStyle: HeroSuggestionDashStyle = {
            "--fearless-suggestion-dash-start": dashStart,
            "--fearless-suggestion-dash-end": dashStart - SUGGESTION_PATH_LENGTH,
          };
          return (
            <rect
              key={`${color}-${index}`}
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="8"
              ry="8"
              pathLength={SUGGESTION_PATH_LENGTH}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="butt"
              strokeDasharray={`${SUGGESTION_DASH_LENGTH} ${dashGap}`}
              style={dashStyle}
            />
          );
        })}
      </svg>
    </span>
  );
}

const LATEST_ACTION_FLASH_DURATION_MS = 3_000;

export function HeroGrid({
  map,
  userId,
  canSuggest,
  isSending,
  send,
  onPreviewHeroIdChange,
}: {
  map: DraftMapSnapshot;
  userId: string;
  canSuggest: boolean;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
  onPreviewHeroIdChange: (heroId: number) => void;
}) {
  const { text } = useDraftLocale();
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
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const selectedHero = selectedHeroId ? FEARLESS_DRAFT_HEROES_BY_ID.get(selectedHeroId) : null;
  const isOwnTurn = map.currentActorId === userId;
  const hideHeroPreview = useCallback(() => setHeroPreview(null), []);
  useHeroSearchHotkeys(searchInputRef, setSearch, hideHeroPreview);

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
    () => HERO_ATTRIBUTE_GROUPS.map((group) => {
      const heroes = sortHeroesAlphabetically(
        visibleHeroes.filter((hero) => hero.primaryAttribute === group.key),
      );
      const emptySlotCount = FEARLESS_DRAFT_HEROES.filter(
        (hero) => hero.primaryAttribute === group.key,
      ).length - heroes.length;
      return { ...group, heroes, emptySlotCount };
    }),
    [visibleHeroes],
  );

  function heroState(heroId: number): HeroState {
    const hero = FEARLESS_DRAFT_HEROES_BY_ID.get(heroId);
    if (!hero?.isCaptainModeEnabled) return "captains-disabled";
    if (unavailable.has(heroId)) return "fearless-locked";
    const action = actionByHero.get(heroId);
    if (!action) return "available";
    if (action.type === "BAN") return "banned";
    return action.actorId === map.radiantPlayerId ? "picked-radiant" : "picked-dire";
  }

  function showHeroPreview(hero: DraftHero, event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const previewWidth = 150;
    const previewHeight = 300;
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
          <span>{text.heroPool}</span>
          <strong>{visibleHeroes.length} {text.heroes}</strong>
        </div>
        <label>
          <FiSearch />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => {
              setHeroPreview(null);
              setSearch(event.target.value);
            }}
            placeholder={text.searchHero}
          />
        </label>
      </div>
      <div className="fearless-hero-grid">
        {groupedHeroes.map((group) => (
          <section className={`fearless-attribute-group ${group.key}`} key={group.key}>
            <header><i /> <strong>{text[group.key]}</strong></header>
            <div>
              {group.heroes.map((hero) => {
                const state = heroState(hero.id);
                const canSelect = isOwnTurn && state === "available";
                const canSuggestHero = canSuggest && state === "available";
                const suggestions = map.heroSuggestions.filter(
                  (suggestion) => suggestion.heroId === hero.id,
                );
                const orderedSuggestions = [...suggestions].sort((left, right) =>
                  Number(right.playerId === userId) - Number(left.playerId === userId),
                );
                const suggestionColors = orderedSuggestions.map((suggestion) =>
                  draftTeamPlayerColor(suggestion.colorSlot),
                );
                const flashClass = flashingAction?.heroId === hero.id
                  ? `just-${flashingAction.type.toLowerCase()}`
                  : "";
                return (
                  <button
                    key={hero.id}
                    className={`${state} ${selectedHeroId === hero.id ? "selected" : ""} ${suggestions.length ? "suggested" : ""} ${flashClass}`}
                    type="button"
                    aria-disabled={!canSelect && !canSuggestHero}
                    aria-label={hero.name}
                    tabIndex={canSelect || canSuggestHero ? 0 : -1}
                    title={
                      state === "fearless-locked"
                        ? text.usedPreviousMap
                        : state === "captains-disabled"
                          ? text.unavailableCaptainsMode
                          : state === "banned"
                            ? text.bannedCurrentMap
                            : hero.name
                    }
                    onMouseEnter={(event) => showHeroPreview(hero, event)}
                    onMouseLeave={() => setHeroPreview(null)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (!canSuggestHero || isSending) return;
                      void send({
                        action: "TOGGLE_HERO_SUGGESTION",
                        heroId: hero.id,
                        expectedVersion: map.version,
                      });
                    }}
                    onClick={() => {
                      if (canSelect) {
                        setSelection({ heroId: hero.id, version: map.version });
                        onPreviewHeroIdChange(hero.id);
                        void send({
                          action: "HIGHLIGHT_HERO",
                          heroId: hero.id,
                          expectedVersion: map.version,
                        });
                      }
                    }}
                  >
                    <span className="fearless-hero-image">
                      <Image src={hero.portraitUrl} alt="" fill sizes="64px" unoptimized />
                      {state === "fearless-locked" && <FiLock />}
                      {state === "banned" && <FiSlash />}
                      {state.startsWith("picked") && <FiCheck />}
                    </span>
                    {suggestions.length > 0 && (
                      <HeroSuggestionFrame colors={suggestionColors} />
                    )}
                  </button>
                );
              })}
              {Array.from({ length: group.emptySlotCount }, (_, index) => (
                <span className="fearless-hero-grid-placeholder" key={`empty-${index}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {selectedHero && (
        <div className="fearless-hero-confirm">
          <Image src={selectedHero.portraitUrl} alt="" width={100} height={176} unoptimized />
          <div>
            <span>{text.selectedHero}</span>
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
            <Image
              className="fearless-hero-confirm-image"
              src={selectedHero.imageUrl}
              alt=""
              fill
              sizes="360px"
              unoptimized
            />
            <span className="fearless-hero-confirm-label">
              {map.currentAction === "BAN" ? text.banHero : text.pickHero}
            </span>
            <span className="fearless-hero-confirm-action">
              {map.currentAction === "BAN" ? text.ban : text.pick}
            </span>
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
              sizes="150px"
              unoptimized
            />
          </span>
          <strong>{heroPreview.hero.name}</strong>
        </div>
      )}
    </section>
  );
}
