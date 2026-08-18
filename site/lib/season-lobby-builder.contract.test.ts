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
const assignmentRules = source("./season-lobby-assignment.ts");
const seasonRoute = source("../app/api/season/route.ts");
const builder = source(
  "../app/tournaments/[slug]/admin/SeasonLobbyBuilder.tsx",
);
const roundPanel = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);
const seasonAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonAdminPanel.tsx",
);

describe("season lobby builder contract", () => {
  it("stores configuration status and exact team slots", () => {
    expect(migration).toContain("lobby_configuration_status");
    expect(migration).toContain("slot_number");
    expect(migration).toContain("season_match_participants_slot_idx");
  });

  it("shows tier and roles and highlights the current drop slot", () => {
    expect(seasonRoute).toContain("AS positions");
    expect(builder).toContain("registration.positions");
    expect(builder).toContain("player.positions");
    expect(builder).toContain('" drag-over"');
    expect(builder).toContain('sortSeasonRegistrations(round.registrations, "tier", "descending")');
  });

  it("keeps only unassigned players in the compact pool", () => {
    expect(builder).toContain("assignedPlayerIds.has(registration.player_id)");
    expect(builder).toContain("unassignedRegistrations.map");
    expect(builder).toContain("Свободные игроки");
    expect(builder).not.toContain("Не распределён");
    expect(builder).not.toContain("<small>Тир</small>");
    expect(builder).not.toContain("<small>Роли</small>");
    expect(builder).toContain("--season-builder-nickname-width");
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
    expect(builder).toContain("Скрыто от участников");
    expect(builder).toContain("Зафиксировать лобби");
    expect(builder).toContain("Отменить публикацию");
    expect(roundPanel).toContain("showPublicLobbies");
  });

  it("places the organizer editor only inside the selected round tab", () => {
    expect(roundPanel).toContain("<SeasonLobbyBuilder round={round} />");
    expect(builder).toContain("Редактор лобби этого тура");
    expect(builder).toContain("Создать лобби");
    expect(builder).toContain("Добавить ещё одно лобби");
    expect(builder).toContain("Удалить одно лобби");
    expect(seasonAdmin).not.toContain("SeasonLobbyBuilder");
    expect(seasonAdmin).not.toContain("Распределение зарегистрированных игроков");
  });

  it("swaps an occupied target into the dragged player's previous slot", () => {
    expect(actions).toContain("planSeasonLobbySlotDrop");
    expect(assignmentRules).toContain("placements.push({ ...source, ...occupiedPlayer })");
  });
});
