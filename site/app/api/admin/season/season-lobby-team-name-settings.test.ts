import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyConfiguredSeasonLobbyTeamNames } from
  "./season-lobby-team-name-settings";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE tournaments (id bigint PRIMARY KEY, slug text NOT NULL);
    CREATE TABLE season_rounds (
      id bigint PRIMARY KEY, tournament_id bigint NOT NULL,
      round_kind text NOT NULL
    );
    CREATE TABLE season_lobbies (
      id bigint PRIMARY KEY, round_id bigint NOT NULL, name varchar(160) NOT NULL
    );
    CREATE TABLE season_matches (
      id bigint PRIMARY KEY, lobby_id bigint NOT NULL,
      team_a_name varchar(120) NOT NULL, team_b_name varchar(120) NOT NULL,
      updated_at timestamptz
    );
    INSERT INTO tournaments VALUES
      (1, 'league-season-9'), (2, 'another-season');
    INSERT INTO season_rounds VALUES
      (11, 1, 'regular'), (12, 1, 'finals'), (21, 2, 'regular');
    INSERT INTO season_lobbies VALUES
      (111, 11, 'Верхнее лобби'),
      (112, 11, 'Среднее лобби'),
      (113, 11, 'Нижнее лобби'),
      (114, 11, 'Самое нижнее лобби'),
      (121, 12, 'Верхнее лобби'),
      (211, 21, 'Верхнее лобби');
    INSERT INTO season_matches
      SELECT id, id, 'Левая команда', 'Правая команда', NULL
      FROM season_lobbies;
  `);
  await db.exec(readFileSync(new URL(
    "../../../../../bot/database/migrations/0125_season_nine_lobby_team_names.sql",
    import.meta.url,
  ), "utf8"));
});

afterAll(async () => {
  await db.close();
});

describe("configured season lobby team names", () => {
  it("backfills the first three season 9 regular lobbies only", async () => {
    const result = await db.query<{
      id: number;
      team_a_name: string;
      team_b_name: string;
    }>(`SELECT id::int, team_a_name, team_b_name
        FROM season_matches ORDER BY id`);
    expect(result.rows).toEqual([
      { id: 111, team_a_name: "Викинги", team_b_name: "Самураи" },
      { id: 112, team_a_name: "Монголы", team_b_name: "Ацтеки" },
      { id: 113, team_a_name: "Крестоносцы", team_b_name: "Спартанцы" },
      { id: 114, team_a_name: "Левая команда", team_b_name: "Правая команда" },
      { id: 121, team_a_name: "Левая команда", team_b_name: "Правая команда" },
      { id: 211, team_a_name: "Левая команда", team_b_name: "Правая команда" },
    ]);
  });

  it("applies the same stored names to a future match", async () => {
    await db.exec(`
      UPDATE season_matches
      SET team_a_name = 'Левая команда', team_b_name = 'Правая команда'
      WHERE id = 113;
    `);
    const client = {
      query: (sql: string, values?: unknown[]) => db.query(sql, values),
    } as PoolClient;
    await applyConfiguredSeasonLobbyTeamNames(client, [113]);
    const result = await db.query<{ team_a_name: string; team_b_name: string }>(
      "SELECT team_a_name, team_b_name FROM season_matches WHERE id = 113",
    );
    expect(result.rows[0]).toEqual({
      team_a_name: "Крестоносцы",
      team_b_name: "Спартанцы",
    });
  });
});
