import { useEffect, useReducer, useRef, useState } from "react";
import { OctoberCompendiumView } from "@/app/organizer/compendium-october/sections/OctoberCompendiumView";
import { CompendiumRewards } from "../../components/CompendiumRewards";
import { FinalRacePreviewPanel } from "../../admin/FinalRacePreview";
import { TestClans } from "./TestClans";
import { TestDaily } from "./TestDaily";
import { TestToolbar } from "../components/TestToolbar";
import { TEST_SECTIONS } from "../model/config";
import { testRewards } from "../model/presentation";
import { INITIAL_TEST_STATE, testReducer, testTotals, type TestState } from "../model/state";

export function TestCompendium({ initialState = INITIAL_TEST_STATE }: { initialState?: TestState } = {}) {
  const [state, dispatch] = useReducer(testReducer, initialState);
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
  return <div className="site-shell platform-shell" data-theme="dark">
    <TestToolbar state={state} dispatch={dispatch} activeId={activeId} onOpen={openSection} />
    <OctoberCompendiumView rootRef={root} sections={TEST_SECTIONS}
      navigation={      <nav className="october-section-navigation" aria-label="Разделы компендиума">{TEST_SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`} aria-label={section.label} title={section.label} aria-current={activeId === section.id ? "step" : undefined} onClick={(event) => { event.preventDefault(); openSection(section.id); }} />)}</nav>}
      clans={<TestClans state={state} />}
      rewards={<CompendiumRewards personalStars={totals.personal} communityStars={0} isPreview showCommunity={false} personalRewards={testRewards(totals.personal)} />}
      race={<FinalRacePreviewPanel state={state.race} personalStars={totals.weekly}
        onChoosePath={(path) => dispatch({ type: "race", action: { type: "choose-path", path } })}
        onCompleteQuest={(dateKey) => dispatch({ type: "race", action: { type: "complete", dateKey } })}
      />}
      daily={<TestDaily state={state} dispatch={dispatch} />}
    />
  </div>;
}
