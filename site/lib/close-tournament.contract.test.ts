import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

describe("close tournament flow", () => {
  it("shows only the match and compact close management", () => {
    const page = source("app/tournaments/[slug]/TournamentPageView.tsx");
    const navigation = source(
      "app/tournaments/[slug]/sections/TournamentNavigation.tsx",
    );
    const admin = source(
      "app/tournaments/[slug]/admin/TournamentAdminPanel.tsx",
    );

    expect(page).toContain("<CloseTournamentOverview />");
    expect(page).toContain("data.tournament.close_event_id ?");
    expect(navigation).toContain("Матч");
    expect(navigation).toContain("Управление");
    expect(admin).toContain("<CloseTournamentAdmin />");
  });

  it("creates exactly one close lobby with its configured best-of", () => {
    const actions = source(
      "app/api/admin/season/season-lobby-configuration-actions.ts",
    );
    const store = source(
      "app/api/admin/season/season-lobby-configuration-store.ts",
    );

    expect(actions).toContain("seasonLobbyNames(round.is_close ? 1 : 2)");
    expect(actions).toContain("round.best_of");
    expect(actions).toContain("Для клоза доступно только одно лобби");
    expect(store).toContain("bestOf = 2");
  });

  it("starts every non-Fearless close format without captain voting", () => {
    const commands = source(
      "app/season-lobby/[matchId]/server/room-commands.ts",
    );
    const roomRoute = source(
      "app/api/season/lobby-room/[matchId]/route.ts",
    );
    const screen = source(
      "app/season-lobby/[matchId]/SeasonLobbyRoomScreen.tsx",
    );

    expect(commands).toContain("startSeasonLobbyWithoutDraft");
    expect(commands).toContain("isDirectCloseGameFormat");
    expect(roomRoute).toContain('command.action === "START_MATCH"');
    expect(screen).toContain("snapshot.usesFearlessDraft");
  });
});
