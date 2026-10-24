import Image from "next/image";
import { FaStar } from "react-icons/fa";
import type { CompendiumClanResult } from "../model/clan-results";

const outcomeLabels = { winner: "Победивший клан", loser: "Проигравший клан", tie: "Ничья", pending: "Текущий результат" };

export function CompendiumClanResults({ clans, isFinished }: { clans: CompendiumClanResult[]; isFinished: boolean }) {
  return <section className="compendium-results-section compendium-clan-results" aria-label="Результаты кланов">
    <header className="compendium-results-section-heading">
      <h2>{isFinished ? "Итоги кланового противостояния" : "Клановое противостояние"}</h2>
      {!isFinished && <p>Победитель определится после завершения 9-го тура лиги и начисления всех звёзд за него.</p>}
    </header>
    <div className="compendium-clan-results-grid">{clans.map((clan) => <article key={clan.id} className={`compendium-clan-result is-${clan.outcome}`}>
      <Image src={clan.emblem} alt="" width={112} height={112} />
      <span>{outcomeLabels[clan.outcome]}</span>
      <h3>{clan.name}</h3>
      <strong><FaStar aria-hidden="true" /> {clan.stars.toLocaleString("ru-RU")}</strong>
      <small>звёзд</small>
    </article>)}</div>
  </section>;
}
