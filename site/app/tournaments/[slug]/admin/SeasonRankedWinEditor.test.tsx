import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { SeasonRoundRegistration } from "../model/season-types";
const state = vi.hoisted(() => ({ isOrganizer: true }));
vi.mock("../hooks/TournamentContext", () => ({ useTournament: () => ({
  season: { data: { isOrganizer: state.isOrganizer }, load: async () => {} }, setToast: () => {},
}) }));
import { SeasonRankedWinEditor } from "./SeasonRankedWinEditor";
const registration = { player_id: "100", round_id: 12, nickname: "Player", positions: "1/5",
  primary_wins: 20, secondary_wins: 10, wins_source: "manual" } as SeasonRoundRegistration;
beforeEach(() => { state.isOrganizer = true; });
it("shows the reset action before the settings button for a manually locked player", () => {
  const markup = renderToStaticMarkup(<SeasonRankedWinEditor registration={registration} />);
  expect(markup).toContain("Отменить ручное внесение");
  expect(markup.indexOf("season-ranked-win-reset")).toBeLessThan(markup.indexOf("season-ranked-win-settings"));
});
it("hides organizer controls from a player", () => {
  state.isOrganizer = false;
  expect(renderToStaticMarkup(<SeasonRankedWinEditor registration={registration} />)).toBe("");
});
it.each(["stratz", "dotabuff", null] as const)("does not offer a manual reset for source %s", (source) => {
  expect(renderToStaticMarkup(<SeasonRankedWinEditor registration={{ ...registration, wins_source: source }} />))
    .not.toContain("Отменить ручное внесение");
});
