import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0078_season_round_lobby_builder.sql",
);
const actions = source(
  "../app/api/admin/season/season-lobby-configuration-actions.ts",
);
const seasonRoute = source("../app/api/season/route.ts");
const builder = source(
  "../app/tournaments/[slug]/admin/SeasonLobbyBuilder.tsx",
);
const roundPanel = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);

describe("season lobby builder contract", () => {
  it("stores configuration status and exact team slots", () => {
    expect(migration).toContain("lobby_configuration_status");
    expect(migration).toContain("slot_number");
    expect(migration).toContain("season_match_participants_slot_idx");
  });

  it("creates two to four named lobbies and validates complete 5 by 5 teams", () => {
    expect(actions).toContain("Верхнее лобби");
    expect(actions).toContain("Среднее лобби");
    expect(actions).toContain("Нижнее лобби");
    expect(actions).toContain("Самое нижнее лобби");
    expect(actions).toContain("team_a_count = 5");
    expect(actions).toContain("team_b_count = 5");
  });

  it("keeps draft lineups private and exposes published lineups", () => {
    expect(seasonRoute).toContain("lobby_configuration_status = 'published'");
    expect(builder).toContain("Только для организатора");
    expect(builder).toContain("Зафиксировать лобби");
    expect(builder).toContain("Отменить публикацию");
    expect(roundPanel).toContain("showPublicLobbies");
  });
});
