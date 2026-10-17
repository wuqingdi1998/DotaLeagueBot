import { useState, type Dispatch } from "react";
import Image from "next/image";
import { HeaderNavigationLink } from "@/app/components/header/HeaderNavigationLink";
import { FaDiscord } from "react-icons/fa";
import { SiBoosty } from "react-icons/si";
import { FiSettings, FiSun, FiX } from "react-icons/fi";
import { TEST_RACE_WEEK, TEST_SECTIONS, TEST_COMPENDIUM } from "../model/config";
import { testTotals, type TestAction, type TestState } from "../model/state";

export function TestToolbar({ state, dispatch, activeId, onOpen }: { state: TestState; dispatch: Dispatch<TestAction>; activeId: string; onOpen: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return <>
    <header className="site-header platform-header compendium-test-header">
      <a className="brand" href="#test-clans" onClick={(event) => { event.preventDefault(); onOpen("test-clans"); }}><Image src="/linkens-sphere-logo.png" alt="Логотип Linken's Sphere Esports" width={48} height={48} /><span><strong>Linken&apos;s Sphere</strong><small>Esports community</small></span></a>
      <nav className="platform-navigation" aria-label="Основная навигация">{["Главная", "Турниры", "Сезон", "Компендиум", "Календарь", "Зал славы", "Участники"].map((label) => <HeaderNavigationLink key={label} href="/compendium" isActive={label === "Компендиум"} beginNavigation={() => {}}>{label}</HeaderNavigationLink>)}</nav>
      <div className="header-actions">
        <span className="community-action-button discord-community-button" aria-hidden="true"><FaDiscord /></span><span className="community-action-button boosty-button boosty-action-button" aria-hidden="true"><SiBoosty /></span><span className="theme-button" aria-hidden="true"><FiSun /></span>
        <button className="player-profile-button compendium-test-settings-button" type="button" aria-label="Управление тестом" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}><FiSettings aria-hidden="true" /><span><strong>ТЕСТ</strong><span data-testid="test-total">★ {testTotals(state).personal}</span></span></button>
        <span className="compendium-test-exit-space" />
      </div>
    </header>
    <aside className="profile-popover compendium-test-controls" hidden={!isOpen} aria-label="Управление тестовым компендиумом">
      <div className="compendium-test-controls-title"><strong>Тестовый компендиум</strong><button type="button" aria-label="Закрыть управление тестом" onClick={() => setIsOpen(false)}><FiX /></button></div>
      <p>Основа не затрагивается. Все участники и результаты здесь вымышленные.</p>
      <nav aria-label="Разделы тестового компендиума">{TEST_SECTIONS.map((section) => <button type="button" key={section.id} aria-current={activeId === section.id ? "page" : undefined} onClick={() => { onOpen(section.id); setIsOpen(false); }}>{section.label}</button>)}</nav>
      <label>День <select aria-label="День теста" value={state.race.activeDay} disabled={state.race.path === null} onChange={(event) => dispatch({ type: "race", action: { type: "set-day", day: Number(event.target.value) } })}>{TEST_RACE_WEEK.quests.map((quest, index) => <option key={quest.dateKey} value={index}>{quest.weekday}, {quest.dateLabel}</option>)}</select></label>
      <button type="button" onClick={() => dispatch({ type: "bonus" })}>+{TEST_COMPENDIUM.bonusStars} тестовых звёзд</button>
      <label><input type="checkbox" checked={state.hasRuneAccess} onChange={(event) => dispatch({ type: "rune-access", hasAccess: event.target.checked })} /> Доступ к рунам (тест)</label>
      <button type="button" onClick={() => { dispatch({ type: "reset" }); setIsOpen(false); }}>Сбросить тест</button>
    </aside>
  </>;
}
