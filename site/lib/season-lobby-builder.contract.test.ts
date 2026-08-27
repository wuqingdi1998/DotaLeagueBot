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
const reserve = source(
  "../app/tournaments/[slug]/admin/SeasonLobbyReserve.tsx",
);
const roundPanel = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);
const seasonAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonAdminPanel.tsx",
);
const lobbyDisplay = source(
  "../app/tournaments/[slug]/sections/SeasonLobbyDisplay.tsx",
);
const builderStyles = source(
  "../app/styles/56-season-lobby-builder.css",
);
const optimizationActions = source(
  "../app/api/admin/season/season-lobby-optimization-actions.ts",
);
const configurationStore = source(
  "../app/api/admin/season/season-lobby-configuration-store.ts",
);

describe("season lobby builder contract", () => {
  it("stores configuration status and exact team slots", () => {
    expect(migration).toContain("lobby_configuration_status");
    expect(migration).toContain("slot_number");
    expect(migration).toContain("season_match_participants_slot_idx");
  });

  it("shows tier and roles and highlights the current drop slot", () => {
    expect(seasonRoute).toContain("AS positions");
    expect(reserve).toContain("registration.positions");
    expect(builder).toContain("player.positions");
    expect(builder).toContain('" drag-over"');
    expect(reserve).toContain(
      'sortSeasonRegistrations(registrations, "tier", "descending")',
    );
  });

  it("keeps only unassigned players in the compact pool", () => {
    expect(builder).toContain("assignedPlayerIds.has(registration.player_id)");
    expect(builder).toContain("unassignedRegistrations");
    expect(reserve).toContain("Запас");
    expect(reserve).not.toContain("Не распределён");
    expect(reserve).not.toContain("<small>Тир</small>");
    expect(reserve).not.toContain("<small>Роли</small>");
    expect(reserve).toContain("--season-builder-nickname-width");
  });

  it("creates one to four named lobbies and validates complete 5 by 5 teams", () => {
    expect(configurationStore).toContain("Верхнее лобби");
    expect(configurationStore).toContain("Среднее лобби");
    expect(configurationStore).toContain("Нижнее лобби");
    expect(configurationStore).toContain("Самое нижнее лобби");
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

  it("lets the organizer set the visible start time without a draft badge", () => {
    expect(builder).toContain("SeasonLobbyScheduleEditor");
    expect(builder).toContain("<SeasonLobbyScheduleEditor lobby={lobby} />");
    expect(lobbyDisplay).toContain("lobbyScheduledAt={lobby.scheduled_at}");
    expect(lobbyDisplay).toContain("lobbyScheduledAt ?? match.scheduled_at");
    expect(lobbyDisplay).not.toContain("seasonLobbyStatusLabel");
  });

  it("swaps an occupied target into the dragged player's previous slot", () => {
    expect(actions).toContain("planSeasonLobbySlotDrop");
    expect(assignmentRules).toContain("placements.push({ ...source, ...occupiedPlayer })");
  });

  it("keeps player labels aligned and uses the shared player colors", () => {
    expect(builder).toContain(
      'className="season-builder-slot-tier season-builder-tier-badge"',
    );
    expect(builder).toContain('className="season-builder-slot-roles"');
    expect(builderStyles).toContain("padding: 4px 12px");
    expect(builderStyles).toMatch(
      /\.season-builder-player-name[^}]*justify-content: flex-start;/,
    );
    expect(builderStyles).toMatch(
      /\.season-builder-player-roles[^}]*justify-content: flex-end;/,
    );
    expect(builderStyles).toContain("color: var(--season-player-name-color)");
    expect(builderStyles).toContain("color: var(--season-player-tier-color)");
    expect(builderStyles).toContain("color: var(--season-player-roles-color)");
  });

  it("optimizes complete lobbies and leaves the remaining players in reserve", () => {
    const lobbies = builder.indexOf('className="season-builder-lobbies"');
    const reserveComponent = builder.indexOf("<SeasonLobbyReserve", lobbies);

    expect(builder).toContain("Оптимальный состав");
    expect(builder).toContain('mutate("optimize")');
    expect(builder).toContain("По тиру сверху вниз");
    expect(builder).toContain('mutate("sortTier")');
    expect(reserveComponent).toBeGreaterThan(lobbies);
    expect(reserve).toContain("Запас");
    expect(optimizationActions).toContain("optimizeSeasonLobbyPlayers");
    expect(optimizationActions).toContain("registration.created_at");
    expect(optimizationActions).toContain("reservePlayerIds");
    expect(optimizationActions).toContain("sortSeasonLobbyTeamByTier");
  });

  it("shows circular tier badges in reserve and assigned lobby slots", () => {
    expect(reserve).toContain(
      'className="season-builder-player-tier season-builder-tier-badge"',
    );
    expect(builder).toContain(
      'className="season-builder-slot-tier season-builder-tier-badge"',
    );
    expect(builderStyles).toMatch(
      /\.season-builder-tier-badge \{[\s\S]*?border-radius: 50%;/,
    );
  });
});
