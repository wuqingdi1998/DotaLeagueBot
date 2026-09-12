import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROUP_STANDINGS_QUERY } from "../app/api/tournament/group-standings-query";

const groupsPanel = readFileSync(
  new URL("../app/tournaments/[slug]/sections/TournamentStages.tsx", import.meta.url),
  "utf8",
);

async function standingsDatabase() {
  const database = new PGlite();
  await database.exec(`
    CREATE TABLE tournament_groups (
      id bigint PRIMARY KEY,
      tournament_id bigint NOT NULL,
      name text NOT NULL,
      sort_order integer NOT NULL
    );
    CREATE TABLE tournament_team_applications (
      id bigint PRIMARY KEY,
      team_name text NOT NULL
    );
    CREATE TABLE tournament_group_teams (
      group_id bigint NOT NULL,
      application_id bigint NOT NULL,
      sort_order integer NOT NULL
    );
    CREATE TABLE tournament_matches (
      id bigint PRIMARY KEY,
      group_id bigint,
      status text NOT NULL,
      team_a_application_id bigint,
      team_b_application_id bigint,
      team_a_score integer,
      team_b_score integer,
      team_a_result_label text,
      team_b_result_label text
    );

    INSERT INTO tournament_groups VALUES (1, 10, 'Группа A', 1);
    INSERT INTO tournament_team_applications VALUES
      (101, 'Alpha'), (102, 'Bravo'), (103, 'Charlie'), (104, 'Delta');
    INSERT INTO tournament_group_teams VALUES
      (1, 101, 1), (1, 102, 2), (1, 103, 3), (1, 104, 4);
    INSERT INTO tournament_matches VALUES
      (1, 1, 'finished', 101, 102, 2, 1, NULL, NULL),
      (2, 1, 'finished', 101, 103, 1, 0, NULL, NULL),
      (3, 1, 'finished', 102, 103, 1, 1, NULL, NULL),
      (4, 1, 'finished', 104, 102, NULL, NULL, 'tw', 'tl'),
      (5, 1, 'live', 103, 104, 8, 0, NULL, NULL);
  `);
  return database;
}

describe("ordinary tournament group standings", () => {
  it("counts won series once regardless of the number of maps", async () => {
    const database = await standingsDatabase();
    const result = await database.query<{
      team_name: string;
      games: number;
      series_wins: number;
      maps_won: number;
      maps_lost: number;
    }>(GROUP_STANDINGS_QUERY, [10]);

    expect(
      result.rows.map(
        ({ team_name, games, series_wins, maps_won, maps_lost }) => ({
          team_name,
          games,
          series_wins,
          maps_won,
          maps_lost,
        }),
      ),
    ).toEqual([
      { team_name: "Alpha", games: 2, series_wins: 2, maps_won: 3, maps_lost: 1 },
      { team_name: "Delta", games: 1, series_wins: 1, maps_won: 1, maps_lost: 0 },
      { team_name: "Bravo", games: 3, series_wins: 0, maps_won: 2, maps_lost: 4 },
      { team_name: "Charlie", games: 2, series_wins: 0, maps_won: 1, maps_lost: 2 },
    ]);
    await database.close();
  }, 15_000);

  it("describes and displays series wins instead of maps", () => {
    expect(groupsPanel).toContain("Место определяется по победам в матчах");
    expect(groupsPanel).toContain("<span>Победы</span>");
    expect(groupsPanel).toContain("<span>Карты</span>");
    expect(groupsPanel).toContain("row.series_wins");
    expect(groupsPanel).toContain("({row.maps_won}–{row.maps_lost})");
  });
});
