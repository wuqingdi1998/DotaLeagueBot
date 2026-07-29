import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const createRoute = source("../app/api/tournament/tournament-create.ts");
const tournamentRoute = source("../app/api/tournament/route.ts");
const publicRoute = source("../app/api/season/route.ts");
const extraQuery = source("../app/api/season/season-extra-query.ts");
const adminRoute = source("../app/api/admin/season/route.ts");
const matchActions = source(
  "../app/api/admin/season/season-match-actions.ts",
);
const navigation = source(
  "../app/tournaments/[slug]/sections/TournamentNavigation.tsx",
);
const roundTabStrip = source(
  "../app/tournaments/[slug]/components/SeasonRoundTabStrip.tsx",
);
const horizontalDragScroll = source(
  "../app/tournaments/[slug]/components/HorizontalDragScroll.tsx",
);
const standings = source(
  "../app/tournaments/[slug]/sections/SeasonStandingsPanel.tsx",
);
const rounds = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);
const matchAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonMatchAdmin.tsx",
);
const teamSelection = source(
  "../app/tournaments/[slug]/admin/SeasonTeamSelection.tsx",
);
const seasonController = source(
  "../app/tournaments/[slug]/hooks/useSeasonController.ts",
);
const tournamentAdmin = source(
  "../app/tournaments/[slug]/admin/TournamentAdminPanel.tsx",
);
const seasonFactsEditor = source(
  "../app/tournaments/[slug]/admin/SeasonFactsEditor.tsx",
);
const seasonFactsRoute = source(
  "../app/api/admin/season-facts/route.ts",
);
const tournamentHero = source(
  "../app/tournaments/[slug]/sections/TournamentHero.tsx",
);
const seasonModel = source("./season.ts");
const participantsTable = source(
  "../app/participants/ParticipantsTable.tsx",
);
const playerProfile = source("../app/players/[dotaId]/page.tsx");
const globalStyles = source("../app/globals.css");
const styles = loadSiteStyles();

describe("season creation and access contract", () => {
  it("creates the requested empty rounds and keeps ordinary as the default", () => {
    expect(createRoute).toContain(
      'String(body.tournament_type ?? "ordinary")',
    );
    expect(createRoute).toMatch(/generate_series\(1, \$2::int\)/);
    expect(createRoute).toMatch(/validSeasonRoundCount\(seasonRoundCount\)/);
  });

  it("filters hidden rounds and draft matches on the server", () => {
    expect(publicRoute).toContain("AND round.is_visible = TRUE");
    expect(publicRoute).toContain(
      "AND match.status IN ('published', 'completed')",
    );
    expect(publicRoute).toContain(
      "AND game.status IN ('published', 'completed')",
    );
    expect(publicRoute).toContain('error: "Тур не найден"');
  });

  it("protects every season write operation with organizer access", () => {
    expect(adminRoute.match(/await requireAdmin\(\)/g)).toHaveLength(3);
    expect(adminRoute).toContain("const admin = await requireAdmin()");
  });
});

describe("season interface contract", () => {
  it("keeps seasonal standings styles in their own module", () => {
    expect(globalStyles).toContain(
      '@import "./styles/25-season-standings-table.css";',
    );
  });

  it("reuses the tournament navigation and replaces ordinary tabs", () => {
    expect(navigation).toContain(
      'className="tabs tournament-tabs season-tournament-tabs"',
    );
    for (const label of ["Обзор", "Таблица", "Управление"]) {
      expect(navigation).toContain(label);
    }
    expect(navigation).not.toContain('["rounds", "Туры"]');
    expect(navigation).toContain("season.data?.rounds");
  });

  it("supports long round navigation and scrolls to the active round", () => {
    expect(navigation).toContain("SeasonRoundTabStrip");
    expect(navigation).toContain("season-navigation-primary");
    expect(navigation).not.toContain("scrollBy");
    expect(roundTabStrip).toContain('scrollToEdge("start")');
    expect(roundTabStrip).toContain('scrollToEdge("end")');
    expect(roundTabStrip).toContain("onPointerDown");
    expect(roundTabStrip).toContain("canScrollBack");
    expect(roundTabStrip).toContain("canScrollForward");
    expect(roundTabStrip).toContain(
      "if (Math.abs(movement) < dragThreshold) return;",
    );
    expect(roundTabStrip.indexOf("setPointerCapture")).toBeGreaterThan(
      roundTabStrip.indexOf("Math.abs(movement) < dragThreshold"),
    );
    expect(roundTabStrip).toContain("keepScrollPositionRef.current = true");
    expect(roundTabStrip).toContain("openRoundWithoutScrolling");
    expect(roundTabStrip).not.toContain("onWheel");
    expect(roundTabStrip).not.toContain("scrollWithWheel");
    expect(styles).toMatch(
      /\.season-tournament-tabs\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*row;/,
    );
    expect(styles).toMatch(
      /\.season-round-tabs\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/,
    );
    expect(styles).toMatch(
      /\.season-round-tabs button\s*\{[^}]*white-space:\s*nowrap;/,
    );
    expect(styles).toMatch(
      /\.season-round-tabs\s*\{[^}]*scrollbar-width:\s*none;/,
    );
    expect(styles).toMatch(
      /\.season-round-tabs::[-]webkit-scrollbar\s*\{[^}]*display:\s*none;/,
    );
    expect(styles).toMatch(
      /\.season-tournament-tabs\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.season-round-navigation\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.tabs \.season-round-edge-button\s*\{[^}]*transform:\s*translateY\(-8px\);/,
    );
  });

  it("shows participant and round totals in the season editor", () => {
    expect(tournamentAdmin).toContain("<span>Участников</span>");
    expect(tournamentAdmin).toContain(
      "season.data?.participants.length ?? 0",
    );
    expect(tournamentAdmin).toContain("<span>Туров</span>");
    expect(tournamentAdmin).toContain(
      "data.tournament.season_round_count",
    );
  });

  it("edits one to nine independent season information segments", () => {
    expect(tournamentAdmin).toContain("<SeasonFactsEditor");
    expect(seasonFactsEditor).toContain("maximumSeasonFactCount");
    expect(seasonFactsEditor).toContain("minimumSeasonFactCount");
    expect(seasonFactsEditor).toContain("Добавить сегмент");
    expect(seasonFactsEditor).toContain("Удалить сегмент");
    expect(seasonFactsEditor).toContain("/api/admin/season-facts");
    expect(seasonFactsRoute).toContain("await requireAdmin()");
    expect(seasonFactsRoute).toContain('!== "seasonal"');
    expect(createRoute).toContain("INSERT INTO tournament_season_facts");
    expect(tournamentRoute).toContain("FROM tournament_season_facts");
    expect(tournamentRoute).toContain("seasonFacts: resolvedSeasonFacts");
    expect(tournamentHero).toContain("data.seasonFacts.map");
    expect(tournamentHero).toContain("--season-fact-count");
    expect(styles).toMatch(
      /\.season-quick-facts\s*\{[^}]*grid-template-columns:[^}]*var\(--season-fact-count\)/,
    );
  });

  it("keeps player identity visible without consuming mobile table width", () => {
    expect(styles).toMatch(
      /\.season-standings-table \.season-player-avatar-column,\s*\.season-standings-table \.season-player-name-column\s*\{[^}]*position:\s*sticky;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*600px\)[\s\S]*?\.season-standings-table \.season-player-name-column\s*\{[^}]*position:\s*static;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*600px\)[\s\S]*?\.season-standings-table \.season-player-avatar-column::after\s*\{[^}]*background:/,
    );
    expect(standings).toContain('className="season-player-avatar-column"');
    expect(standings).toContain('className="season-player-name-column"');
    expect(standings).toContain("cell.matchIds[0]");
    expect(standings).toContain("season.openRound");
  });

  it("drags seasonal tables without turning a drag into a click", () => {
    expect(standings.match(/<HorizontalDragScroll/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
    expect(horizontalDragScroll).toContain("onPointerDown");
    expect(horizontalDragScroll).toContain(
      "if (Math.abs(movement) < dragThreshold) return;",
    );
    expect(horizontalDragScroll.indexOf("setPointerCapture")).toBeGreaterThan(
      horizontalDragScroll.indexOf("Math.abs(movement) < dragThreshold"),
    );
    expect(horizontalDragScroll).toContain("suppressClickRef.current");
    expect(horizontalDragScroll).toContain("onClickCapture");
    expect(horizontalDragScroll).toContain('event.pointerType === "touch"');
  });

  it("uses compact score columns and solid circular sticky identities", () => {
    expect(standings.match(/season-compact-column/g)?.length).toBeGreaterThanOrEqual(
      10,
    );
    expect(styles).toMatch(
      /\.season-standings-table \.season-compact-column\s*\{[^}]*width:\s*48px;[^}]*min-width:\s*48px;/,
    );
    expect(styles).toMatch(
      /\.season-player-avatar-link (?:img|img,\s*\.season-player-avatar-link i)[\s\S]*?aspect-ratio:\s*1;[^}]*object-fit:\s*cover;/,
    );
    expect(styles).toMatch(
      /\.season-standings-table\s*\{[^}]*border-collapse:\s*separate;[^}]*border-spacing:\s*0;/,
    );
    expect(styles).toContain(".season-player-name-column::after");
    expect(styles).toContain(".season-player-avatar-column::before");
  });

  it("keeps legend explanations inline and removes the unused pending item", () => {
    expect(standings).not.toContain("Результат ещё не внесён");
    expect(standings.match(/season-legend-explanation/g)).toHaveLength(3);
    expect(styles).toMatch(
      /\.season-standings-legend p\.season-legend-explanation\s*\{[^}]*display:\s*block;/,
    );
  });

  it("uses live seasonal nicknames and links every public player name", () => {
    expect(publicRoute).toContain("player.ingame_name AS nickname");
    expect(publicRoute).toContain("player.steam_id32::text AS dota_id");
    expect(publicRoute).not.toContain(
      "participant.nickname_snapshot, player.ingame_name",
    );
    expect(extraQuery).not.toContain(
      "participant.nickname_snapshot, player.ingame_name",
    );
    expect(seasonModel).toContain("dotaId: string");
    expect(rounds.match(/PlayerProfileLink/g)?.length).toBeGreaterThanOrEqual(4);
    expect(standings.match(/PlayerProfileLink/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(rounds).toContain("player.dota_id");
    expect(standings).toContain("row.dotaId");
    expect(seasonController).toContain("window.setInterval");
    expect(seasonController).toContain("visibilitychange");
    expect(seasonController).toContain('window.addEventListener("focus"');
  });

  it("keeps unlinked archive finalists styled like linked finalists", () => {
    expect(rounds).toContain('className="season-finalist-seed"');
    expect(styles).toContain(".season-finalist-seed");
    expect(styles).not.toContain(".season-finalist-list article > span");
  });

  it("reuses the profile service icons in the participant directory", () => {
    expect(playerProfile).toContain("PlayerServiceIcon");
    expect(participantsTable).toContain("PlayerServiceIcon");
    expect(participantsTable).not.toContain(">DB<");
  });

  it("keeps Discord direct messages out of participant profiles", () => {
    expect(playerProfile).not.toContain("profile.links.discord");
    expect(playerProfile).not.toContain('service="discord"');
  });

  it("creates safe external links only when a map has a match id", () => {
    expect(rounds).toContain('target="_blank"');
    expect(rounds).toContain('rel="noopener noreferrer"');
    expect(rounds).toContain("seasonMatchLinks");
  });

  it("renders lobbies as scoreboards with structured team lineups", () => {
    expect(rounds).toContain("season-match-scoreboard");
    expect(rounds).toContain("season-temporary-team");
    expect(rounds).toContain("season-status-pill");
    expect(styles).toMatch(
      /\.season-match-scoreboard\s*\{[^}]*grid-template-columns:/,
    );
    expect(styles).toMatch(
      /\.season-match-heading span\s*\{[^}]*font-size:\s*14px;/,
    );
    expect(styles).toMatch(
      /\.season-temporary-team li strong\s*\{[^}]*font-size:\s*16px;/,
    );
  });

  it("keeps and displays the tier recorded for each round appearance", () => {
    expect(publicRoute).toContain("participant.tier_snapshot::int");
    expect(rounds).toContain("player.tier_snapshot");
    expect(rounds).toContain('className="player-tier"');
    expect(rounds).toContain("Сумма тиров");
    expect(rounds).toContain("tierTotal");
    expect(rounds).not.toContain("{players.length}/5");
    expect(rounds).not.toContain("<b>Тир {player.tier_snapshot}</b>");
    expect(matchAdmin).toContain("playerTierSnapshots");
    expect(teamSelection).toContain("SeasonTierEditor");
    expect(matchActions).toContain("previousTiers");
    expect(matchActions).toContain("submittedTiers");
  });

  it("selects match players from season participants with search and checkboxes", () => {
    expect(matchAdmin).toContain("season.data?.participants");
    expect(matchAdmin).not.toContain("<select multiple");
    expect(teamSelection).toContain('type="checkbox"');
    expect(teamSelection).toContain("Поиск по никнейму");
    expect(teamSelection).toContain("Уже в другой команде");
    expect(seasonController).not.toContain("/api/players");
  });

  it("does not repeat inactive reasons below every player nickname", () => {
    expect(standings).not.toContain(
      "row.inactiveReason && <small>{row.inactiveReason}</small>",
    );
  });
});
