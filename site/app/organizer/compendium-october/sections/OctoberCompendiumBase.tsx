import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { FiArrowLeft, FiGift } from "react-icons/fi";
import { OCTOBER_COMPENDIUM_DATE_LABEL, OCTOBER_COMPENDIUM_WEEKS } from "../model/plan";
import { OctoberRacePreview } from "./OctoberActivityPreview";

export function OctoberCompendiumBase() {
  return (
    <main className="compendium-base-page october-compendium-base">
      <section className="compendium-base-hero">
        <Link href="/organizer/compendium-october" className="compendium-base-back">
          <FiArrowLeft aria-hidden="true" /> Вернуться в компендиум
        </Link>
        <span className="compendium-base-kicker">Только для организатора</span>
        <h1>База компендиума</h1>
        <p>
          Здесь видны условия всех трёх недель. Участникам будущие задания не показываются.
          Это закрытый план: звёзды пока не начисляются, конкретные призы добавим позже.
        </p>
        <div className="compendium-base-totals">
          <div><FiGift aria-hidden="true" /><strong>3</strong><span>недельные гонки</span></div>
          <div><FaStar aria-hidden="true" /><strong>21</strong><span>задание гонок</span></div>
          <div><FiGift aria-hidden="true" /><strong>2</strong><span>призовых места в каждой</span></div>
        </div>
      </section>
      <div className="compendium-rewards-section">
        <p className="october-compendium-example-note">{OCTOBER_COMPENDIUM_DATE_LABEL} · все условия по московскому времени</p>
        {OCTOBER_COMPENDIUM_WEEKS.map((week) => (
          <OctoberRacePreview key={week.id} week={week} />
        ))}
      </div>
    </main>
  );
}
