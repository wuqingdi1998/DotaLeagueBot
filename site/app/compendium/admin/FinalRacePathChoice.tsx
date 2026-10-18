import Image from "next/image";
import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { FINAL_RACE_PATHS, type FinalRacePath } from "./final-race-preview";
import { FinalRacePathConfirmation } from "./FinalRacePathConfirmation";

export function FinalRacePathChoice({ onChoosePath }: { onChoosePath: (path: FinalRacePath) => void }) {
  const [pendingPath, setPendingPath] = useState<FinalRacePath | null>(null);
  return <section className="compendium-star-race compendium-final-race-choice">
    <header className="compendium-final-race-choice-intro">
      <h2>Выберите свою стезю</h2>
      <p>Выбор в первый день определяет задания всей недели. Условия откроются после выбора.</p>
    </header>
    <div className="compendium-final-race-paths">
      {FINAL_RACE_PATHS.map((path) => <button key={path.id} type="button" aria-label={path.title} onClick={() => setPendingPath(path.id)} className={`compendium-final-race-path compendium-final-race-path-${path.id}`}>
        <Image src={path.image} alt="" width={900} height={600} unoptimized priority />
        <span className="compendium-final-race-path-copy"><strong>{path.title}</strong><span>{path.description}</span><FiArrowRight aria-hidden="true" /></span>
      </button>)}
    </div>
    <footer className="compendium-final-race-choice-note">
      <p>4 звезды за задание с понедельника по субботу, 5 — в воскресенье.</p>
      <p><strong>Выбор пути окончательный — изменить его нельзя.</strong></p>
    </footer>
    {pendingPath && <FinalRacePathConfirmation path={pendingPath} onClose={() => setPendingPath(null)} onConfirm={() => onChoosePath(pendingPath)} />}
  </section>;
}
