"use client";

import Image from "next/image";
import { SiteHeader } from "@/app/components/SiteHeader";
import { TournamentAdminPanel } from "./admin/TournamentAdminPanel";
import { TournamentModals } from "./components/TournamentModals";
import { useTournament } from "./hooks/TournamentContext";
import { CommunityFooter } from "./sections/CommunityFooter";
import { MatchesPanel } from "./sections/MatchesPanel";
import { OverviewPanel } from "./sections/OverviewPanel";
import { TeamsPanel } from "./sections/TeamsPanel";
import {
  SeasonOverviewPanel,
} from "./sections/SeasonOverviewPanel";
import { SeasonRoundPanel } from "./sections/SeasonRoundsPanel";
import { SeasonStandingsPanel } from "./sections/SeasonStandingsPanel";
import {
  TournamentHeading,
  TournamentHero,
} from "./sections/TournamentHero";
import {
  TournamentInvitations,
  TournamentNavigation,
} from "./sections/TournamentNavigation";
import {
  GroupsPanel,
  PlayoffsPanel,
  RulesPanel,
} from "./sections/TournamentStages";

export function TournamentPageView() {
  const { data, loadData, loadingError, setTheme, theme } = useTournament();

  if (loadingError) {
    return (
      <main className="error-screen" data-theme={theme}>
        <Image
          src="/linkens-sphere-logo.png"
          alt=""
          width={74}
          height={74}
          priority
          unoptimized
        />
        <h1>Сайт временно не загрузился</h1>
        <p>{loadingError}</p>
        <button onClick={() => void loadData()}>Попробовать снова</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-screen" data-theme={theme}>
        <Image
          src="/linkens-sphere-logo.png"
          alt=""
          width={74}
          height={74}
          priority
          unoptimized
        />
        <span>Загружаем турнир</span>
      </main>
    );
  }

  return (
    <main className="site-shell" data-theme={theme}>
      <SiteHeader
        theme={theme}
        setTheme={setTheme}
        user={data.user}
        discordUrl={data.tournament.discord_url}
      />

      <TournamentHero />

      <section className="tournament-section" id="tournament">
        <TournamentInvitations />
        <TournamentHeading />
        <TournamentNavigation />
        <OverviewPanel />
        <SeasonOverviewPanel />
        <SeasonStandingsPanel />
        <SeasonRoundPanel />
        <TeamsPanel />
        <MatchesPanel />
        <GroupsPanel />
        <PlayoffsPanel />
        <RulesPanel />
        <TournamentAdminPanel />
      </section>

      <CommunityFooter />
      <TournamentModals />
    </main>
  );
}
