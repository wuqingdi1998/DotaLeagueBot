import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { defaultLeagueBackdropId, leagueBackdropById, leagueBackdropOptions } from "./league-backdrops";
it("defaults to icy orbital rings and includes them in the tournament directory", () => {
  expect(defaultLeagueBackdropId).toBe("3");
  expect(leagueBackdropById(defaultLeagueBackdropId)?.label).toContain("Орбитальные кольца");
  const directory = readFileSync(new URL("../../TournamentsHub.tsx", import.meta.url), "utf8");
  expect(directory).toContain('<PlatformShell user={data.user} hasLeagueBackdrop>');
  expect(directory).toContain('{hasLeagueBackdrop && <LeagueBackdrop />}');
});
it("offers twenty distinct designs and rejects unknown saved choices", () => {
  expect(leagueBackdropOptions).toHaveLength(20);
  expect(new Set(leagueBackdropOptions.map((option) => option.backgroundImage)).size).toBe(20);
  expect(leagueBackdropOptions.map((option) => option.id)).toEqual(Array.from({ length: 20 }, (_, index) => String(index + 1)));
  expect(leagueBackdropById("none")).toBeUndefined();
  expect(leagueBackdropById("21")).toBeUndefined();
});
it("shares the default backdrop while restricting the picker to organizers", () => {
  const page = readFileSync(new URL("../TournamentPageView.tsx", import.meta.url), "utf8");
  expect(page).toContain('Boolean(data.user?.isAdmin)');
  expect(page).not.toContain('data.tournament.slug ===');
  expect(page).toContain('className="site-shell league-backdrop-preview-shell"');
  expect(page).toContain("<LeagueBackdrop organizerId=");
  expect(page).toContain("profileMenuExtras={canPreviewBackdrop ? <>");
  expect(page).toContain("<LeagueBackdropPicker organizerId=");
});
