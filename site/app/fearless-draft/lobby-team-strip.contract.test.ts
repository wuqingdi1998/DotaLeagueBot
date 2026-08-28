import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const roomScreen = source(
  "app/season-lobby/[matchId]/SeasonLobbyRoomScreen.tsx",
);
const draftScreen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const teamPanel = source("app/fearless-draft/components/DraftTeamPanel.tsx");
const roster = source("app/fearless-draft/components/DraftLobbyTeamStrip.tsx");
const serviceLogo = source(
  "app/fearless-draft/components/DraftProfileServiceLogo.tsx",
);
const styles = source("app/styles/51-fearless-draft-lobby-roster.css");
const globals = source("app/globals.css");

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
    expect(activeDraft).toContain('className="fearless-lobby-side-status radiant"');
    expect(activeDraft).toContain('className="fearless-lobby-side-status dire"');
    expect(activeDraft).toContain("Math.ceil(radiantReserve)");
    expect(activeDraft).toContain("Math.ceil(direReserve)");
    expect(styles).toContain("grid-template-columns: minmax(150px, 1fr) auto minmax(150px, 1fr)");
  });

  it("renders five avatar controls per team with profile ears and presence dots", () => {
    expect(teamPanel).toContain("<DraftLobbyTeamStrip players={teamPlayers}");
    expect(roster).toContain("players.slice(0, 5)");
    expect(roster).toContain('aria-label={`STRATZ: ${player.name}`}');
    expect(roster).toContain('aria-label={`DotaBuff: ${player.name}`}');
    expect(roster).toContain('className={`fearless-lobby-player-presence ${player.isOnline ? "online" : "offline"}`}');
    expect(roster).not.toContain("В сети");
    expect(styles).toContain(".fearless-lobby-profile-ear.left");
    expect(styles).toContain(".fearless-lobby-profile-ear.right");
    expect(styles).toContain(".fearless-lobby-player-presence");
  });

  it("uses the original service marks and keeps presence inside the avatar", () => {
    expect(roster).toContain('<DraftProfileServiceLogo service="stratz" />');
    expect(roster).toContain('<DraftProfileServiceLogo service="dotabuff" />');
    expect(roster).toContain("fearless-lobby-profile-ear left stratz");
    expect(roster).toContain("fearless-lobby-profile-ear right dotabuff");
    expect(serviceLogo).toContain('service === "stratz"');
    expect(serviceLogo).toContain('viewBox="0 0 300 300"');
    expect(serviceLogo).toContain('viewBox="0 0 450 448"');
    expect(serviceLogo).toContain('aria-hidden="true"');
    expect(styles).toContain(".fearless-lobby-profile-ear.stratz");
    expect(styles).toContain(".fearless-lobby-profile-ear.dotabuff");
    expect(styles).toMatch(
      /\.fearless-lobby-player-avatar\s*\{[^}]*overflow:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-profile-ear\s*\{[^}]*height:\s*var\(--roster-avatar-size\);/,
    );
    expect(styles).toMatch(
      /\.fearless-lobby-player-presence\s*\{[^}]*z-index:\s*6;[^}]*right:\s*2px;[^}]*bottom:\s*2px;/,
    );
  });

  it("loads the roster styling after the shared board styles", () => {
    const boardImport = '@import "./styles/51-fearless-draft-board.css";';
    const rosterImport = '@import "./styles/51-fearless-draft-lobby-roster.css";';
    expect(globals).toContain(rosterImport);
    expect(globals.indexOf(rosterImport)).toBeGreaterThan(
      globals.indexOf(boardImport),
    );
  });
});
