import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function taggedJson<T>(sql: string, tag: string): T {
  const match = sql.match(
    new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$::jsonb`),
  );
  expect(match, `Не найден блок ${tag}`).not.toBeNull();
  return JSON.parse(match?.[1] ?? "null") as T;
}

type Snapshot = {
  playedRounds: number;
  wins: number;
  draws: number;
  losses: number;
  adjustmentPoints: number;
  activityPoints: number;
  points: number;
  rounds: Record<string, { points: number; outcome: string }>;
};

type Player = {
  nickname: string;
  section: "active" | "inactive";
  rank: number;
  snapshot: Snapshot | null;
};

type Final = {
  title: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  result: string;
  teamA: Array<{ displayNickname: string; sourceNickname: string }>;
  teamB: Array<{ displayNickname: string; sourceNickname: string }>;
};

const migration = source(
  "../../bot/database/migrations/0050_league_season_3.sql",
);
const standingsPanel = source(
  "../app/tournaments/[slug]/sections/SeasonStandingsPanel.tsx",
);
const roundsPanel = [
  source("../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx"),
  source("../app/tournaments/[slug]/sections/SeasonLobbyDisplay.tsx"),
].join("\n");
const tournamentRoute = source("../app/api/tournament/route.ts");
const players = taggedJson<Player[]>(migration, "season3_players");
const finals = taggedJson<Final[]>(migration, "season3_final_matches");

describe("Season 3 archive import", () => {
  it("preserves all rows and the original section order", () => {
    expect(players).toHaveLength(76);
    expect(players.filter((player) => player.snapshot)).toHaveLength(75);
    expect(players.filter((player) => player.section === "active")).toHaveLength(
      66,
    );
    expect(players.filter((player) => player.section === "inactive")).toHaveLength(
      10,
    );
    expect(players[0]).toMatchObject({ nickname: "Besst", rank: 1 });
    expect(players[65]).toMatchObject({ nickname: "Yoichi", rank: 66 });
    expect(players[66]).toMatchObject({ nickname: "Uclonist", rank: 1 });
    expect(migration).toContain("\n        64,\n        'EU / RU',");
    expect(migration).not.toContain("\n        76,\n        'EU / RU',");
  });

  it("keeps the Excel totals, colors, p and +ap rules", () => {
    const besst = players.find((player) => player.nickname === "Besst");
    expect(besst?.snapshot).toMatchObject({
      playedRounds: 12,
      wins: 5,
      draws: 7,
      losses: 0,
      activityPoints: 4,
      points: 21,
    });
    expect(Object.keys(besst?.snapshot?.rounds ?? {})).toHaveLength(12);

    const kepleomax = players.find(
      (player) => player.nickname === "Kepleomax",
    );
    expect(kepleomax?.snapshot).toMatchObject({
      playedRounds: 8,
      wins: 2,
      draws: 3,
      losses: 2,
      activityPoints: 2,
    });
    expect(Object.keys(kepleomax?.snapshot?.rounds ?? {})).toHaveLength(7);

    expect(migration).toContain("За каждые 4 сыгранных матча");
    expect(migration).toContain('"nickname":"Игрок","amount":1,"kind":"manual"');
    expect(migration).toContain('"nickname":"Noro","amount":1,"kind":"manual"');
  });

  it("imports both supplied finals without guessing nickname aliases", () => {
    expect(finals).toHaveLength(2);
    expect(finals[0]).toMatchObject({
      title: "Верхний финал",
      teamAName: "Fergusity",
      teamBName: "Miners Dance",
      teamAScore: 2,
      teamBScore: 0,
      result: "team_a",
    });
    expect(finals[1]).toMatchObject({
      title: "Нижний финал",
      teamAName: "Negri",
      teamBName: "Raby Nagieva",
      teamAScore: 1,
      teamBScore: 2,
      result: "team_b",
    });
    expect(finals.every((match) => match.teamA.length === 5)).toBe(true);
    expect(finals.every((match) => match.teamB.length === 5)).toBe(true);
    expect(players.some((player) => player.nickname === "mudachyo")).toBe(true);
    expect(players.some((player) => player.nickname === "mydachyo")).toBe(true);
    expect(migration).toContain("active_player.is_archived = FALSE");
  });

  it("renders archived colored cells and the exact activity explanation", () => {
    expect(standingsPanel).toContain(
      "Результат перенесён из итоговой таблицы",
    );
    expect(standingsPanel).toContain(
      "data?.tournament.season_activity_points_note",
    );
    expect(roundsPanel).toContain("Составы лобби этого тура не сохранились");
    expect(tournamentRoute).toContain("season_activity_points_note");
  });
});
