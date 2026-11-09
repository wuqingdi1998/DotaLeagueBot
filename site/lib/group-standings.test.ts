import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROUP_STANDINGS_QUERY } from "../app/api/tournament/group-standings-query";
import { rankGroupStandings, type GroupStandingResult } from "./group-standings";

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

async function loadStandings(database: PGlite) {
  const { rows } = await database.query<GroupStandingResult>(GROUP_STANDINGS_QUERY, [10]);
  return rankGroupStandings(rows);
}

describe("ordinary tournament group standings", () => {
  it("counts won series once regardless of the number of maps", async () => {
    const database = await standingsDatabase();
    const rows = await loadStandings(database);

    expect(
      rows.map(
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
      { team_name: "Charlie", games: 2, series_wins: 0, maps_won: 1, maps_lost: 2 },
      { team_name: "Bravo", games: 3, series_wins: 0, maps_won: 2, maps_lost: 4 },
    ]);
    await database.close();
  }, 15_000);

  it("shares places for a finished draw and sorts the tied teams by name", async () => {
    const database = await standingsDatabase();
    try {
      await database.exec(`
        DELETE FROM tournament_matches;
        UPDATE tournament_team_applications SET team_name = 'Ястребы' WHERE id = 102;
        UPDATE tournament_team_applications SET team_name = 'беркуты' WHERE id = 104;
        INSERT INTO tournament_groups VALUES (2, 11, 'Другая группа', 1);
        INSERT INTO tournament_group_teams VALUES (2, 102, 1), (2, 104, 2);
        INSERT INTO tournament_matches VALUES
          (1, 1, 'finished', 101, 103, 2, 0, NULL, NULL),
          (2, 1, 'finished', 102, 104, 1, 1, NULL, NULL),
          (3, 1, 'live', 103, 104, 9, 0, NULL, NULL),
          (4, 2, 'finished', 102, 104, 2, 0, NULL, NULL);
      `);
      const rows = await loadStandings(database);
      expect(rows.map((row) => row.application_id)).toEqual([101, 104, 102, 103]);
      expect(rows.map((row) => [row.place, row.place_end])).toEqual([[1, 1], [2, 3], [2, 3], [4, 4]]);
      expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4]);
      expect(rows[0]).not.toHaveProperty("meetings");
    } finally {
      await database.close();
    }
  }, 15_000);

  it("puts the head-to-head winner first when wins and map difference are equal", async () => {
    const database = await standingsDatabase();
    try {
      await database.exec(`
        DELETE FROM tournament_matches;
        UPDATE tournament_group_teams SET sort_order = 5 WHERE application_id = 101;
        INSERT INTO tournament_matches VALUES
          (1, 1, 'finished', 102, 101, 0, 2, NULL, NULL),
          (2, 1, 'finished', 102, 103, 2, 0, NULL, NULL),
          (3, 1, 'finished', 104, 101, 2, 0, NULL, NULL);
      `);
      const rows = await loadStandings(database);
      expect(rows.map((row) => row.application_id)).toEqual([104, 101, 102, 103]);
      expect(rows.map((row) => [row.place, row.place_end])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4]]);
    } finally {
      await database.close();
    }
  }, 15_000);

  it("keeps places distinct before a direct meeting has a result", async () => {
    const database = await standingsDatabase();
    try {
      await database.exec(`
        DELETE FROM tournament_matches;
        INSERT INTO tournament_matches VALUES
          (1, 1, 'finished', 101, 102, NULL, NULL, NULL, NULL),
          (2, 1, 'live', 103, 104, 1, 1, NULL, NULL);
      `);
      const rows = await loadStandings(database);
      expect(rows.map((row) => [row.place, row.place_end])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4]]);
    } finally {
      await database.close();
    }
  }, 15_000);

  it("describes the ranking criteria and displays wins and maps", () => {
    expect(groupsPanel).toContain("Место определяется по победам в матчах, разнице карт и личным встречам");
    expect(groupsPanel).toContain("<span>Победы</span>");
    expect(groupsPanel).toContain("<span>Карты</span>");
    expect(groupsPanel).toContain("row.series_wins");
    expect(groupsPanel).toContain("({row.maps_won}–{row.maps_lost})");
  });

  it("shows the registered team emblem with an initials fallback", () => {
    expect(groupsPanel).toContain("applicationsById.get(row.application_id)");
    expect(groupsPanel).toContain("<CompactTeamEmblem");
    expect(groupsPanel).toContain('className="standing-team-emblem"');
    expect(groupsPanel).toContain("logoKey={application?.logo_key}");
  });
});
