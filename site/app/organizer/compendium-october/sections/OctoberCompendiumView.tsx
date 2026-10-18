import type { ReactNode, Ref } from "react";
import { FiCalendar } from "react-icons/fi";
import { OCTOBER_COMPENDIUM_DATE_LABEL } from "../model/plan";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";

export function OctoberCompendiumView({ navigation, clans, rewards, race, daily, rootRef,
  sections = OCTOBER_PREVIEW_SECTIONS, isFinalRace = false,
}: {
  navigation: ReactNode; clans: ReactNode; rewards: ReactNode; race: ReactNode; daily: ReactNode;
  rootRef?: Ref<HTMLElement>; sections?: readonly { id: string }[]; isFinalRace?: boolean;
}) {
  return (
    <main ref={rootRef} className="compendium-page october-compendium-preview" id="october-compendium-scroll">
      {navigation}
      <section className="october-compendium-screen october-compendium-screen-clans" id={sections[0].id} aria-label="Шапка компендиума и кланы">
        <div className="compendium-hero-section">
          <div className="compendium-title-block">
            <h1>Компендиум</h1>
            <p className="october-compendium-hero-line">Сезон 9. Часть 1.</p>
          </div>
          <div className="compendium-summary">
            <div className="compendium-tournament-countdown">
              <FiCalendar aria-hidden="true" />
              <span>Период события</span>
              <strong>{OCTOBER_COMPENDIUM_DATE_LABEL}</strong>
            </div>
          </div>
        </div>
        <div className="compendium-rewards-section">
          {clans}
        </div>
      </section>

      <section className="october-compendium-screen october-compendium-screen-personal" id={sections[1].id} aria-label="Личный зачёт">
        <div className="compendium-rewards-section">
          {rewards}
        </div>
      </section>

      <section className={`october-compendium-screen october-compendium-screen-race${isFinalRace ? " october-final-race-screen" : ""}`} id={sections[2].id} aria-label="Гонка за звёздами">
        <div className="compendium-rewards-section">
          {race}
        </div>
      </section>

      <section className="october-compendium-screen october-compendium-screen-daily" id={sections[3].id} aria-label="Задания дня">
        {daily}
      </section>
    </main>
  );
}
