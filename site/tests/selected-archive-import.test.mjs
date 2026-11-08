import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { selectedArchiveImport } from "../../scripts/generate-selected-archive-import.mjs";
import { loadPlayerMapStatistics } from "../lib/player-map-statistics";

const databaseQuery = vi.hoisted(() => vi.fn());
vi.mock("../lib/db", () => ({ query: databaseQuery }));
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const { tournaments, data, sql } = selectedArchiveImport();
const migration = read("../../bot/database/migrations/development/0198_selected_archive_tournaments.sql");
let database;

beforeAll(async () => {
  database = new PGlite();
  await database.exec(read("./fixtures/selected-archive-schema.sql"));
  await database.exec(`
    INSERT INTO players(discord_id,steam_id32,ingame_name) VALUES
      (1000,1000,'Flower today'), (1001,1001,'Future linked profile'), (1002,1002,'Sanraizu');
    INSERT INTO player_nickname_history(player_id,nickname)
      VALUES (1000,'.flowerZ');
  `);
  await database.exec(`BEGIN;${migration}COMMIT;`);
  databaseQuery.mockImplementation(async (query, parameters) => (await database.query(query, parameters)).rows);
}, 30000);
afterAll(async () => { await database?.close(); });

describe("selected tournament archive import", () => {
  it("reproduces the checked dev-only migration and all six complete tournaments", () => {
    expect(migration).toBe(sql);
    expect(tournaments.map((t) => [t.name, t.teams.length, t.matches.length,
      t.matches.reduce((n, m) => n + m.scoreA + m.scoreB, 0)])).toEqual([
      ["LS 15k Showdown", 8, 22, 28], ["LS Call to Arms 2026", 6, 13, 15],
      ["LS Draft #1", 4, 8, 9], ["LS Item Draft", 4, 8, 10],
      ["LS Pre-season Bash", 6, 12, 13], ["SD Fastcup #1", 6, 9, 10],
    ]);
    expect(data.rosters).toHaveLength(170);
    expect(data.rosters.filter((p) => p.isCaptain)).toHaveLength(4);
    for (const t of tournaments) {
      expect(t.groupOrder).toHaveLength(t.teams.length);
      for (const team of t.teams) expect(team.players).toHaveLength(5);
      for (const m of t.matches) {
        expect(m.resultType).toBe("normal");
        expect(m.scoreA + m.scoreB).toBeLessThanOrEqual(m.bestOf);
        expect(Math.max(m.scoreA, m.scoreB)).toBe(Math.ceil(m.bestOf / 2));
        expect(m.teamA).not.toBe(m.teamB);
      }
    }
  });

  it("keeps source nicknames while resolving a changed nickname through history", async () => {
    const rows = (await database.query(`SELECT nickname_snapshot,player_id::text AS player_id
      FROM tournament_roster_snapshots WHERE nickname_snapshot='.flowerZ'`)).rows;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.player_id === "1000")).toBe(true);
    const draftCaptains = (await database.query(`SELECT count(*)::int AS count
      FROM tournament_roster_snapshots s JOIN tournament_team_applications a ON a.id=s.application_id
      JOIN tournaments t ON t.id=a.tournament_id WHERE t.slug='ls-draft-1' AND s.is_captain`)).rows;
    expect(draftCaptains[0].count).toBe(4);
    const persisted = (await database.query(`SELECT t.slug,a.team_name,s.nickname_snapshot,s.role,s.tier_snapshot
      FROM tournament_roster_snapshots s JOIN tournament_team_applications a ON a.id=s.application_id
      JOIN tournaments t ON t.id=a.tournament_id`)).rows;
    for (const roster of data.rosters) expect(persisted).toContainEqual({
      slug: roster.slug, team_name: roster.teamName, nickname_snapshot: roster.nickname,
      role: roster.role, tier_snapshot: roster.tier,
    });
    expect(data.rosters.filter((r) => ["Pancake", "swiplash", "hexagon"].includes(r.nickname)).every((r) => r.dotaId === null)).toBe(true);
  });

  it("counts every imported map and victory in the real player statistics query", async () => {
    const snapshots = (await database.query(`SELECT t.slug,s.player_id::text AS player_id,s.nickname_snapshot
      FROM tournament_roster_snapshots s JOIN tournament_team_applications a ON a.id=s.application_id
      JOIN tournaments t ON t.id=a.tournament_id`)).rows;
    const expected = new Map();
    for (const tournament of tournaments) {
      for (const team of tournament.teams) {
        const matches = tournament.matches.filter((m) => [m.teamA, m.teamB].includes(team.teamName));
        const maps = matches.reduce((n, m) => n + m.scoreA + m.scoreB, 0);
        const wins = matches.reduce((n, m) => n + (m.teamA === team.teamName ? m.scoreA : m.scoreB), 0);
        for (const player of team.players) {
          const snapshot = snapshots.find((s) => s.slug === tournament.metadata.slug && s.nickname_snapshot === player.nickname);
          const byTournament = expected.get(snapshot.player_id) ?? new Map();
          expect(byTournament.has(tournament.name)).toBe(false);
          byTournament.set(tournament.name, { maps, mapWins: wins });
          expected.set(snapshot.player_id, byTournament);
        }
      }
    }
    let playerMaps = 0;
    let playerWins = 0;
    for (const [playerId, expectedTournaments] of expected) {
      const actual = await loadPlayerMapStatistics([playerId]);
      expect(actual.tournaments).toHaveLength(expectedTournaments.size);
      for (const row of actual.tournaments) expect({ maps: row.maps, mapWins: row.mapWins }).toEqual(expectedTournaments.get(row.tournamentName));
      playerMaps += actual.maps; playerWins += actual.mapWins;
    }
    expect(playerMaps).toBe(850); // 85 карт × 10 участников.
    expect(playerWins).toBe(425); // В каждой карте пять победителей.
    const champion = snapshots.find((s) => s.slug === "ls-15k-showdown" &&
      tournaments[0].teams.find((t) => t.teamName === "Папы в офисе").players.some((p) => p.nickname === s.nickname_snapshot));
    const stats = await loadPlayerMapStatistics([champion.player_id]);
    expect(stats.tournaments.find((t) => t.tournamentName === "LS 15k Showdown")).toMatchObject({ maps: 13, mapWins: 9 });
  }, 30000);

  it("keeps map totals and historical nicknames after linking an archive and duplicate membership", async () => {
    const source = (await database.query(`SELECT player_id::text AS player_id,application_id,role,nickname_snapshot
      FROM tournament_roster_snapshots WHERE nickname_snapshot='Mapes' LIMIT 1`)).rows[0];
    expect(source).toBeDefined();
    const before = await loadPlayerMapStatistics([source.player_id]);
    await database.query(`UPDATE player_identity_members SET identity_id=(SELECT identity_id
      FROM player_identity_members WHERE player_id=1001) WHERE player_id=$1`, [source.player_id]);
    await database.query(`INSERT INTO tournament_team_members(application_id,player_id,role,nickname_snapshot,invitation_status)
      VALUES($1,1001,$2,'Future linked profile','accepted')`, [source.application_id, source.role]);
    const members = (await database.query(`SELECT player_id::text AS player_id FROM player_identity_members
      WHERE identity_id=(SELECT identity_id FROM player_identity_members WHERE player_id=1001)`)).rows.map((r) => r.player_id);
    expect(await loadPlayerMapStatistics(members)).toEqual(before);
    expect((await database.query(`SELECT DISTINCT nickname_snapshot FROM tournament_roster_snapshots WHERE player_id=$1`, [source.player_id])).rows).toEqual([{ nickname_snapshot: "Mapes" }]);
    await database.query("DELETE FROM tournament_team_members WHERE player_id=1001");
  });

  it("can be applied again without duplicate matches, players, rosters, or awards", async () => {
    const counts = async () => (await database.query(`SELECT
      (SELECT count(*)::int FROM players) AS players,
      (SELECT count(*)::int FROM tournaments) AS tournaments,
      (SELECT count(*)::int FROM tournament_matches) AS matches,
      (SELECT count(*)::int FROM tournament_roster_snapshots) AS rosters,
      (SELECT count(*)::int FROM tournament_groups) AS groups,
      (SELECT count(*)::int FROM tournament_prizes) AS prizes`)).rows;
    const before = await counts();
    await database.exec(`BEGIN;${migration}COMMIT;`);
    expect(await counts()).toEqual(before);
  }, 30000);

  it("applies owner confirmations, preserves historical nicknames and merges all five Bash maps", async () => {
    const before = await loadPlayerMapStatistics(["1002"]);
    const timing = read("../../bot/database/migrations/0199_optional_tournament_timing.sql");
    const confirmation = read("../../bot/database/migrations/development/0200_selected_archive_confirmations.sql");
    await database.exec(`BEGIN;${timing}${confirmation}COMMIT;`);
    const after = await loadPlayerMapStatistics((await database.query(`SELECT member.player_id::text AS id
      FROM player_identity_members member WHERE identity_id=(SELECT identity_id FROM player_identity_members WHERE player_id=1002)`)).rows.map((r) => r.id));
    expect(after.maps - before.maps).toBe(5);
    expect(after.mapWins - before.mapWins).toBe(2);
    expect(after.tournaments.find((t) => t.tournamentName === "LS Pre-season Bash")).toMatchObject({ maps: 5, mapWins: 2 });
    const historical = (await database.query("SELECT nickname_snapshot FROM tournament_roster_snapshots WHERE nickname_snapshot='!Flopz!'" )).rows;
    expect(historical).toEqual([{ nickname_snapshot: "!Flopz!" }]);
    const optional = (await database.query(`SELECT registration_deadline,check_in_minutes,show_start_in_overview
      FROM tournaments`)).rows;
    expect(optional).toHaveLength(6);
    expect(optional.every((t) => t.registration_deadline === null && t.check_in_minutes === null && t.show_start_in_overview === false)).toBe(true);
    const prizes = (await database.query(`SELECT p.prize_text FROM tournament_prizes p JOIN tournaments t
      ON t.id=p.tournament_id WHERE t.slug='ls-item-draft' AND p.placement IN (1,2) ORDER BY p.placement`)).rows;
    expect(prizes).toEqual([{ prize_text: "3500₽" }, { prize_text: "1500₽" }]);
    await database.exec(`BEGIN;${confirmation}COMMIT;`);
  }, 30000);
});
