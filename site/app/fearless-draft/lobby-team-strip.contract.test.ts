import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const roomScreen = source(
  "app/season-lobby/[matchId]/SeasonLobbyRoomScreen.tsx",
);
const roomQuery = source(
  "app/season-lobby/[matchId]/server/room-query.ts",
);
const draftScreen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const draftChoices = source("app/fearless-draft/sections/DraftChoices.tsx");
const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const teamPanel = source("app/fearless-draft/components/DraftTeamPanel.tsx");
const roster = source("app/fearless-draft/components/DraftLobbyTeamStrip.tsx");
const serviceLogo = source(
  "app/fearless-draft/components/DraftProfileServiceLogo.tsx",
);
const avatarPreloader = source(
  "app/fearless-draft/components/DraftAvatarPreloader.tsx",
);
const statisticsPopover = source(
  "app/fearless-draft/components/DraftPlayerStatisticsPopover.tsx",
);
const statisticsService = source(
  "app/fearless-draft/services/player-statistics.ts",
);
const lobbyPreviewService = source(
  "app/fearless-draft/server/lobby-preview-service.ts",
);
const playerProfile = source("lib/player-profile.ts");
const stratzLogo = source("public/fearless-draft/stratz-logo.svg");
const styles = source("app/styles/51-fearless-draft-lobby-roster.css");
const routeStyles = source("app/styles/fearless-draft-route.css");

describe("Fearless Draft season lobby team strip", () => {
  it("passes all ten room players into the shared draft board", () => {
    expect(roomScreen).toContain("lobbyPlayers={snapshot.players.map");
    expect(draftScreen).toContain("lobbyPlayers?: DraftLobbyPlayer[]");
    expect(draftScreen).toContain("lobbyPlayers={lobbyPlayers}");
    expect(activeDraft).toContain("lobbyPlayers?: DraftLobbyPlayer[]");
    expect(activeDraft).toContain("draftLobbyTeamForCaptain(lobbyPlayers, radiant.id)");
    expect(activeDraft).toContain("draftLobbyTeamForCaptain(lobbyPlayers, dire.id)");
  });

  it("moves side, pick order, and reserve beside the turn plaque", () => {
    expect(activeDraft).toContain('className="fearless-lobby-turn-group"');
    expect(activeDraft).toContain("fearless-lobby-side-status radiant");
    expect(activeDraft).toContain("fearless-lobby-side-status dire");
    expect(activeDraft).toContain("Math.ceil(radiantReserve)");
    expect(activeDraft).toContain("Math.ceil(direReserve)");
    expect(styles).toContain("grid-template-columns: minmax(170px, max-content) auto minmax(170px, max-content)");
    expect(styles).toContain("justify-content: center");
  });

  it("renders five avatar controls per team with profile ears and presence dots", () => {
    expect(teamPanel).toContain("<DraftLobbyTeamStrip");
    expect(teamPanel).toContain("players={teamPlayers}");
    expect(roster).toContain("players.slice(0, 5)");
    expect(roster).toContain('aria-label={`STRATZ: ${player.name}`}');
    expect(roster).toContain('aria-label={`DotaBuff: ${player.name}`}');
    expect(statisticsPopover).toContain('className={`fearless-lobby-player-presence ${player.isOnline ? "online" : "offline"}`}');
    expect(roster).not.toContain("В сети");
    expect(styles).toContain(".fearless-lobby-profile-ear.left");
    expect(styles).toContain(".fearless-lobby-profile-ear.right");
    expect(styles).toContain(".fearless-lobby-player-presence");
  });

  it("preloads every lobby avatar while the coin toss is running", () => {
    expect(draftScreen).toContain("lobbyPlayers={activeLobbyPlayers}");
    expect(draftChoices).toContain("<DraftAvatarPreloader");
    expect(draftChoices).toContain("lobbyPlayers={lobbyPlayers}");
    expect(avatarPreloader).toContain("staticAvatarUrl");
    expect(avatarPreloader).toContain('startMode="immediate"');
    expect(avatarPreloader).toContain("lobbyPlayers.flatMap");
  });

  it("uses the original service marks and keeps presence inside the avatar", () => {
    expect(roster).toContain('<DraftProfileServiceLogo service="stratz" />');
    expect(roster).toContain('<DraftProfileServiceLogo service="dotabuff" />');
    expect(roster).toContain("fearless-lobby-profile-ear left stratz");
    expect(roster).toContain("fearless-lobby-profile-ear right dotabuff");
    expect(serviceLogo).toContain('service === "stratz"');
    expect(serviceLogo).toContain('src="/fearless-draft/stratz-logo.svg"');
    expect(serviceLogo).toContain('viewBox="0 0 450 448"');
    expect(serviceLogo).toContain('aria-hidden="true"');
    expect(stratzLogo).toContain("data:image/png;base64,");
    expect(stratzLogo).toContain('stroke="#0aa9c6"');
    expect(styles).toContain(".fearless-lobby-profile-ear.stratz");
    expect(styles).toContain(".fearless-lobby-profile-ear.dotabuff");
    expect(styles).toMatch(
      /\.fearless-lobby-player-avatar\s*\{[^}]*overflow:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear\s*\{[^}]*height:\s*var\(--roster-avatar-size\);/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear\.left\s*\{[^}]*margin-right:\s*-12px;/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear\.right\s*\{[^}]*margin-left:\s*-12px;/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-player-presence\s*\{[^}]*z-index:\s*6;[^}]*right:\s*2px;[^}]*bottom:\s*2px;/,
    );
  });

  it("shows the same six profile statistics when an avatar is hovered", () => {
    expect(roster).toContain("<DraftPlayerStatisticsPopover player={player} />");
    expect(statisticsPopover).toContain("createPortal");
    expect(statisticsPopover).toContain("onMouseEnter={showStatistics}");
    expect(statisticsPopover).toContain("Турниров");
    expect(statisticsPopover).toContain("Побед в турнирах");
    expect(statisticsPopover).toContain("Призовых мест");
    expect(statisticsPopover).toContain("Карт");
    expect(statisticsPopover).toContain("Побед на картах");
    expect(statisticsPopover).toContain("Победный процент");
    expect(statisticsService).toContain("/api/players/");
    expect(playerProfile).toContain("winRate: mapWinRatePercent(mapStatistics)");
    expect(styles).toContain(".fearless-lobby-statistics-popover");
  });

  it("shows every player's full server name in the avatar popover", () => {
    expect(roomQuery).toContain("playerServerName");
    expect(roomScreen).toContain("serverName: player.serverName");
    expect(lobbyPreviewService).toContain("serverName: user.serverName");
    expect(lobbyPreviewService).toContain("playerServerName(");
    expect(statisticsPopover).toContain("player.serverName ?? player.name");
    expect(styles).toMatch(
      /\.fearless-lobby-statistics-popover > header strong\s*\{[^}]*white-space:\s*normal;/,
    );
  });

  it("enlarges the roster controls without making their header taller", () => {
    expect(styles).toContain("--roster-avatar-size: clamp(46px, 3.8vw, 64px)");
    expect(styles).toContain("--roster-ear-width: clamp(23px, 2vw, 32px)");
    expect(styles).toMatch(
      /header\.fearless-lobby-team-header\s*\{[^}]*min-height:\s*84px;/,
    );
  });

  it("runs each ear edge under the avatar and highlights it without moving", () => {
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear\.left\s*\{[^}]*border-radius:\s*10px 0 0 10px;/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear\.right\s*\{[^}]*border-radius:\s*0 10px 10px 0;/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear:hover,[\s\S]*?outline:\s*2px solid var\(--profile-ear-highlight\);/,
    );
    const hoverRule = styles.match(
      /\.fearless-lobby-profile-ear:hover,[\s\S]*?\}/,
    )?.[0] ?? "";
    expect(hoverRule).not.toContain("transform:");
    expect(styles).toContain("--profile-ear-highlight: #8beeff");
    expect(styles).toContain("--profile-ear-highlight: #ff9b91");
  });

  it("loads the roster styling after the shared board styles", () => {
    const boardImport = '@import "./51-fearless-draft-board.css";';
    const rosterImport = '@import "./51-fearless-draft-lobby-roster.css";';
    expect(routeStyles).toContain(rosterImport);
    expect(routeStyles.indexOf(rosterImport)).toBeGreaterThan(
      routeStyles.indexOf(boardImport),
    );
  });
});
