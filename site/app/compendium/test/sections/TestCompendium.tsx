import { useEffect, useReducer, useRef, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { CompendiumRewards } from "../../components/CompendiumRewards";
import { FinalRacePreviewPanel } from "../../admin/FinalRacePreview";
import { TestClans } from "./TestClans";
import { TestDaily } from "./TestDaily";
import { TestToolbar } from "../components/TestToolbar";
import { TEST_COMPENDIUM, TEST_SECTIONS } from "../model/config";
import { testRewards } from "../model/presentation";
import { INITIAL_TEST_STATE, testReducer, testTotals } from "../model/state";

export function TestCompendium() {
  const [state, dispatch] = useReducer(testReducer, INITIAL_TEST_STATE);
  const [activeId, setActiveId] = useState<string>(TEST_SECTIONS[0].id);
  const root = useRef<HTMLElement>(null);
  const totals = testTotals(state);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.id);
    }, { root: innerWidth > 960 && innerHeight >= 700 ? root.current : null, threshold: [0.5, 0.75] });
    root.current?.querySelectorAll(".october-compendium-screen").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  function openSection(id: string) {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  return <div className="site-shell" data-theme="dark">
    <TestToolbar state={state} dispatch={dispatch} activeId={activeId} onOpen={openSection} />
    <main ref={root} className="compendium-page october-compendium-preview compendium-test-page">
      <nav className="october-section-navigation" aria-label="Разделы компендиума">{TEST_SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`} aria-label={section.label} title={section.label} aria-current={activeId === section.id ? "step" : undefined} onClick={(event) => { event.preventDefault(); openSection(section.id); }} />)}</nav>
      <section className="october-compendium-screen october-compendium-screen-clans" id="test-clans" aria-label="Кланы (тест)">
        <div className="compendium-hero-section"><div className="compendium-title-block"><h1>{TEST_COMPENDIUM.title}</h1><p className="october-compendium-hero-line">{TEST_COMPENDIUM.subtitle}</p></div>
          <div className="compendium-summary"><div className="compendium-tournament-countdown"><FiCalendar aria-hidden="true" /><span>Период события</span><strong>{TEST_COMPENDIUM.dateLabel}</strong></div></div>
        </div><div className="compendium-rewards-section"><TestClans state={state} /></div>
      </section>
      <section className="october-compendium-screen october-compendium-screen-personal" id="test-personal" aria-label="Личный зачёт (тест)"><div className="compendium-rewards-section"><CompendiumRewards personalStars={totals.personal} communityStars={0} isPreview showCommunity={false} personalRewards={testRewards(totals.personal)} /></div></section>
      <section className="october-compendium-screen october-compendium-screen-race october-final-race-screen" id="test-race" aria-label="Гонка (тест)"><div className="compendium-rewards-section"><FinalRacePreviewPanel state={state.race} personalStars={totals.weekly}
        onChoosePath={(path) => dispatch({ type: "race", action: { type: "choose-path", path } })}
        onCompleteQuest={(dateKey) => dispatch({ type: "race", action: { type: "complete", dateKey } })}
      /></div></section>
      <section className="october-compendium-screen october-compendium-screen-daily" id="test-daily" aria-label="Задания (тест)"><TestDaily state={state} dispatch={dispatch} /></section>
    </main>
  </div>;
}
