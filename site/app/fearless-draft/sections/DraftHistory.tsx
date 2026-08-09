import Image from "next/image";
import { COMPENDIUM_HEROES } from "@/app/compendium/model/heroes";
import type { DraftActionSnapshot } from "../model/snapshot";

const heroesById = new Map(COMPENDIUM_HEROES.map((hero) => [hero.id, hero]));

export function DraftHistory({ actions }: { actions: DraftActionSnapshot[] }) {
  return (
    <aside className="fearless-history">
      <header>
        <span>История карты</span>
        <strong>{actions.length} / 24</strong>
      </header>
      <div>
        {[...actions].reverse().map((action) => {
          const hero = action.heroId ? heroesById.get(action.heroId) : null;
          return (
            <article key={action.step}>
              <b>{action.step + 1}</b>
              <span className={action.type.toLowerCase()}>{action.type}</span>
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
