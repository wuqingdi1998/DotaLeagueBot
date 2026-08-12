import Image from "next/image";
import { FEARLESS_DRAFT_HEROES } from "../model/heroes";
import { FiX } from "react-icons/fi";
import type { DraftActionSnapshot } from "../model/snapshot";

const heroesById = new Map(FEARLESS_DRAFT_HEROES.map((hero) => [hero.id, hero]));

export function DraftHistory({
  actions,
  radiantPlayerId,
  isDrawerOpen = false,
  onClose,
}: {
  actions: DraftActionSnapshot[];
  radiantPlayerId: string;
  isDrawerOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <aside
      className={`fearless-history ${isDrawerOpen ? "drawer-open" : ""}`}
      id="fearless-draft-history"
    >
      <header>
        <span>История карты</span>
        <strong>{actions.length} / 24</strong>
        {onClose && (
          <button type="button" aria-label="Закрыть историю" onClick={onClose}>
            <FiX />
          </button>
        )}
      </header>
      <div>
        {actions.map((action) => {
          const hero = action.heroId ? heroesById.get(action.heroId) : null;
          return (
            <article key={action.step}>
              <b>{action.step + 1}</b>
              <span className={action.actorId === radiantPlayerId ? "radiant" : "dire"}>
                {action.type}
              </span>
              {hero ? (
                <Image src={hero.imageUrl} alt="" width={44} height={25} unoptimized />
              ) : <i>—</i>}
              <strong>{hero?.name ?? "Пропущено"}</strong>
              {action.isAutomatic && <small>авто</small>}
            </article>
          );
        })}
        {!actions.length && <p>Первое действие скоро появится здесь.</p>}
      </div>
    </aside>
  );
}
