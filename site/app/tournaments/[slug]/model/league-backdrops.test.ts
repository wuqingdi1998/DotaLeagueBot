import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { leagueBackdropById, leagueBackdropOptions } from "./league-backdrops";
it("offers twenty distinct designs and rejects unknown saved choices", () => {
  expect(leagueBackdropOptions).toHaveLength(20);
  expect(new Set(leagueBackdropOptions.map((option) => option.backgroundImage)).size).toBe(20);
  expect(leagueBackdropOptions.map((option) => option.id)).toEqual(Array.from({ length: 20 }, (_, index) => String(index + 1)));
  expect(leagueBackdropById("none")).toBeUndefined();
  expect(leagueBackdropById("21")).toBeUndefined();
});
it("restricts both the picker and decoration to season-nine organizers", () => {
  const page = readFileSync(new URL("../TournamentPageView.tsx", import.meta.url), "utf8");
  expect(page).toContain('data.user?.isAdmin && data.tournament.slug === "league-season-9"');
  expect(page).toContain("{canPreviewBackdrop && <LeagueBackdrop");
  expect(page).toContain("profileMenuExtras={canPreviewBackdrop ? <LeagueBackdropPicker");
});
