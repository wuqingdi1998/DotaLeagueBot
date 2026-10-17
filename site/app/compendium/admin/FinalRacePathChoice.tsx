import Image from "next/image";
import { FiArrowRight } from "react-icons/fi";
import { FINAL_RACE_PATHS, type FinalRacePath } from "./final-race-preview";

export function FinalRacePathChoice({ onChoosePath }: { onChoosePath: (path: FinalRacePath) => void }) {
  return <section className="compendium-star-race compendium-final-race-choice">
    <div className="compendium-star-race-heading"><h2>Выберите свою стезю</h2></div>
    <p>Выбор в первый день определяет задания всей недели. Условия откроются после выбора.</p>
    <div className="compendium-final-race-paths">
      {FINAL_RACE_PATHS.map((path) => <button key={path.id} type="button" aria-label={path.title} onClick={() => onChoosePath(path.id)} className={`compendium-final-race-path compendium-final-race-path-${path.id}`}>
        <Image src={path.image} alt="" width={900} height={600} unoptimized priority />
        <span className="compendium-final-race-path-copy"><strong>{path.title}</strong><span>{path.description}</span><FiArrowRight aria-hidden="true" /></span>
      </button>)}
    </div>
    <p>4 звезды за задание с понедельника по субботу, 5 – в воскресенье. Один путь на всю неделю.</p>
  </section>;
}
