import Image from "next/image";
import { DRAFT_SEQUENCE } from "../model/config";
import { FEARLESS_DRAFT_HEROES_BY_ID } from "../model/heroes";
import type {
  DraftActionSnapshot,
  DraftLobbyPlayer,
  DraftPlayer,
} from "../model/snapshot";
import { DraftLobbyTeamStrip } from "./DraftLobbyTeamStrip";
import { PlayerAvatar } from "./PlayerAvatar";
import { useDraftLocale } from "../hooks/useDraftLocale";

function draftSlots(priority: "FIRST" | "SECOND", type: "PICK" | "BAN") {
  return DRAFT_SEQUENCE.flatMap((sequenceStep, step) =>
    sequenceStep.actor === priority && sequenceStep.type === type ? [step] : [],
  );
}

export function DraftTeamPanel({
  player,
  side,
  priority,
  actions,
  currentStep,
  previewHeroId,
  reserveSeconds,
  isCurrent,
  isConnected,
  teamPlayers,
  showPlayerColors = false,
}: {
  player: DraftPlayer;
  side: "RADIANT" | "DIRE";
  priority: "FIRST" | "SECOND";
  actions: DraftActionSnapshot[];
  currentStep: number;
  previewHeroId: number | null;
  reserveSeconds: number;
  isCurrent: boolean;
  isConnected: boolean;
  teamPlayers?: DraftLobbyPlayer[];
  showPlayerColors?: boolean;
}) {
  const { text } = useDraftLocale();
  const actionsByStep = new Map(actions.map((action) => [action.step, action]));
  const pickSteps = draftSlots(priority, "PICK");
  const banSteps = draftSlots(priority, "BAN");
  const previewHero = previewHeroId ? FEARLESS_DRAFT_HEROES_BY_ID.get(previewHeroId) : null;
  const sideLabel = side === "RADIANT" ? text.radiant : text.dire;
  const priorityLabel = priority === "FIRST" ? text.firstPick : text.secondPick;
  return (
    <article className={`fearless-team-panel ${side.toLowerCase()} ${isCurrent ? "current" : ""}`}>
      <header className={teamPlayers ? "fearless-lobby-team-header" : undefined}>
        {teamPlayers ? (
          <DraftLobbyTeamStrip
            players={teamPlayers}
            showPlayerColors={showPlayerColors}
          />
        ) : (
          <>
            <PlayerAvatar player={player} freezeAnimation />
            <div>
              <span>{sideLabel} · {priorityLabel}</span>
              <strong>{player.name}</strong>
              <small className={isConnected ? undefined : "disconnected"}>
                <i /> {isConnected ? text.online : text.opponentDisconnected}
              </small>
            </div>
            <div className="fearless-team-reserve">
              <span>{text.reserve}</span>
              <strong>{Math.ceil(reserveSeconds)}{text.secondsShort}</strong>
            </div>
          </>
        )}
      </header>
      <div className="fearless-pick-slots">
        {pickSteps.map((step) => {
          const action = actionsByStep.get(step);
          const isCurrentAction = isCurrent && step === currentStep;
          const hero = action?.heroId
            ? FEARLESS_DRAFT_HEROES_BY_ID.get(action.heroId)
            : null;
          const isPreviewing = !action && isCurrentAction && Boolean(previewHero);
          const displayedHero = hero ?? (isPreviewing ? previewHero : null);
          return (
            <div
              key={step}
              className={`${hero ? "filled" : ""} ${isCurrentAction ? "current-action" : ""} ${isPreviewing ? "previewing" : ""}`}
            >
              {displayedHero ? (
                <>
                  <Image src={displayedHero.imageUrl} alt="" fill sizes="160px" unoptimized />
                  <span>{displayedHero.name}</span>
                </>
              ) : null}
              <small className="fearless-slot-step">{step + 1}</small>
            </div>
          );
        })}
      </div>
      <div className="fearless-ban-list">
        <span>{text.bans}</span>
        {banSteps.map((step, banIndex) => {
          const action = actionsByStep.get(step);
          const isCurrentAction = isCurrent && step === currentStep;
          const previousBanStep = banSteps[banIndex - 1];
          const isPhaseStart = previousBanStep !== undefined &&
            DRAFT_SEQUENCE[previousBanStep].phase !== DRAFT_SEQUENCE[step].phase;
          const hero = action?.heroId ? FEARLESS_DRAFT_HEROES_BY_ID.get(action.heroId) : null;
          const isPreviewing = !action && isCurrentAction && Boolean(previewHero);
          const displayedHero = hero ?? (isPreviewing ? previewHero : null);
          return (
            <div
              key={step}
              className={`${hero ? "filled" : ""} ${isCurrentAction ? "current-action" : ""} ${isPreviewing ? "previewing" : ""} ${isPhaseStart ? "phase-start" : ""}`}
              title={displayedHero?.name ?? (action ? text.skippedBan : `${text.step} ${step + 1}`)}
            >
              {displayedHero ? (
                <Image src={displayedHero.imageUrl} alt={displayedHero.name} fill sizes="48px" unoptimized />
              ) : null}
              <small className="fearless-slot-step">{step + 1}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}
