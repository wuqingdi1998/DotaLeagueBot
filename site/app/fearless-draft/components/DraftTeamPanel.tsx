import Image from "next/image";
import { FEARLESS_DRAFT_HEROES } from "../model/heroes";
import type {
  DraftActionSnapshot,
  DraftPlayer,
} from "../model/snapshot";
import { PlayerAvatar } from "./PlayerAvatar";

const heroesById = new Map(FEARLESS_DRAFT_HEROES.map((hero) => [hero.id, hero]));

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
  const picks = actions.filter(
    (action) => action.actorId === player.id && action.type === "PICK",
  );
  const bans = actions.filter(
    (action) => action.actorId === player.id && action.type === "BAN",
  );
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
        {Array.from({ length: 5 }, (_, index) => {
          const hero = picks[index]?.heroId
            ? heroesById.get(picks[index].heroId as number)
            : null;
          return (
            <div key={index} className={hero ? "filled" : ""}>
              {hero ? (
                <>
                  <Image src={hero.imageUrl} alt="" fill sizes="160px" unoptimized />
                  <span>{hero.name}</span>
                </>
              ) : <b>{index + 1}</b>}
            </div>
          );
        })}
      </div>
      <div className="fearless-ban-list">
        <span>Баны</span>
        {bans.map((action) => {
          const hero = action.heroId ? heroesById.get(action.heroId) : null;
          return (
            <div key={action.step} title={hero?.name ?? "Бан пропущен по таймеру"}>
              {hero ? (
                <Image src={hero.imageUrl} alt={hero.name} fill sizes="48px" unoptimized />
              ) : <b>—</b>}
            </div>
          );
        })}
      </div>
    </article>
  );
}
