"use client";

import Image from "next/image";
import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { FINAL_RACE_PATHS, FINAL_RACE_REGULAR_REWARD, FINAL_RACE_SUNDAY_REWARD, type FinalRacePath } from "../model/final-star-race-definitions";
import { FinalRacePathConfirmation } from "./FinalRacePathConfirmation";

export function FinalRacePathChoice({ onChoosePath, isBusy = false, canChoose = true }: { onChoosePath: (path: FinalRacePath) => void; isBusy?: boolean; canChoose?: boolean }) {
  const [pendingPath, setPendingPath] = useState<FinalRacePath | null>(null);
  return <section className="compendium-star-race compendium-final-race-choice">
    <header className="compendium-final-race-choice-intro">
      <h2>Выберите свою стезю</h2>
      <p>Выбрать путь можно до конца недели. Прошедшие дни не засчитываются.</p>
    </header>
    <div className="compendium-final-race-paths">
      {FINAL_RACE_PATHS.map((path) => <button disabled={isBusy || !canChoose} key={path.id} type="button" aria-label={path.title} onClick={() => setPendingPath(path.id)} className={`compendium-final-race-path compendium-final-race-path-${path.id}`}>
        <Image src={path.image} alt="" width={900} height={600} unoptimized priority />
        <span className="compendium-final-race-path-copy"><strong>{path.title}</strong><span>{path.description}</span><FiArrowRight aria-hidden="true" /></span>
      </button>)}
    </div>
    <footer className="compendium-final-race-choice-note">
      <p>{FINAL_RACE_REGULAR_REWARD} звезды за задание с понедельника по субботу, {FINAL_RACE_SUNDAY_REWARD} — в воскресенье.</p>
      <p><strong>Выбор пути окончательный — изменить его нельзя.</strong></p>
    </footer>
    {pendingPath && <FinalRacePathConfirmation path={pendingPath} isBusy={isBusy} onClose={() => setPendingPath(null)} onConfirm={() => onChoosePath(pendingPath)} />}
  </section>;
}
