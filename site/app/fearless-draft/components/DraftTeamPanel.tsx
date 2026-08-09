import Image from "next/image";
import { DRAFT_SEQUENCE } from "../model/config";
import { FEARLESS_DRAFT_HEROES } from "../model/heroes";
import type {
  DraftActionSnapshot,
  DraftPlayer,
} from "../model/snapshot";
import { PlayerAvatar } from "./PlayerAvatar";

const heroesById = new Map(FEARLESS_DRAFT_HEROES.map((hero) => [hero.id, hero]));

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
  reserveSeconds,
  isCurrent,
  isConnected,
}: {
  player: DraftPlayer;
  side: "RADIANT" | "DIRE";
  priority: "FIRST" | "SECOND";
  actions: DraftActionSnapshot[];
  reserveSeconds: number;
  isCurrent: boolean;
  isConnected: boolean;
}) {
  const actionsByStep = new Map(actions.map((action) => [action.step, action]));
  const pickSteps = draftSlots(priority, "PICK");
  const banSteps = draftSlots(priority, "BAN");
  return (
    <article className={`fearless-team-panel ${side.toLowerCase()} ${isCurrent ? "current" : ""}`}>
      <header>
        <PlayerAvatar player={player} />
        <div>
          <span>{side} · {priority} PICK</span>
          <strong>{player.name}</strong>
          <small className={isConnected ? "connected" : "disconnected"}>
            <i /> {isConnected ? "В сети" : "Соперник отключился"}
          </small>
        </div>
        <div className="fearless-team-reserve">
          <span>Reserve</span>
          <strong>{Math.ceil(reserveSeconds)}с</strong>
        </div>
      </header>
      <div className="fearless-pick-slots">
        {pickSteps.map((step) => {
          const action = actionsByStep.get(step);
          const hero = action?.heroId
            ? heroesById.get(action.heroId)
            : null;
          return (
            <div key={step} className={action ? "filled" : ""}>
              {hero ? (
                <>
                  <Image src={hero.imageUrl} alt="" fill sizes="160px" unoptimized />
                  <span>{hero.name}</span>
                </>
              ) : action ? <b>—</b> : null}
              <small className="fearless-slot-step">{step + 1}</small>
            </div>
          );
        })}
      </div>
      <div className="fearless-ban-list">
        <span>Баны</span>
        {banSteps.map((step) => {
          const action = actionsByStep.get(step);
          const hero = action?.heroId ? heroesById.get(action.heroId) : null;
          return (
            <div
              key={step}
              className={action ? "filled" : ""}
              title={hero?.name ?? (action ? "Бан пропущен по таймеру" : `Шаг ${step + 1}`)}
            >
              {hero ? (
                <Image src={hero.imageUrl} alt={hero.name} fill sizes="48px" unoptimized />
              ) : action ? <b>—</b> : null}
              <small className="fearless-slot-step">{step + 1}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}
