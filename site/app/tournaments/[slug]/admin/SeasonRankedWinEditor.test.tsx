import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { SeasonRoundRegistration } from "../model/season-types";
const state = vi.hoisted(() => ({ isOrganizer: true, isDeveloper: true }));
vi.mock("../hooks/TournamentContext", () => ({ useTournament: () => ({
  data: { user: {discordId: state.isDeveloper ? "311247030422863882" : "553265835335090177",isAdmin:state.isOrganizer} },
  season: { data: { isOrganizer: state.isOrganizer }, load: async () => {} }, setToast: () => {},
}) }));
import { SeasonRankedWinEditor } from "./SeasonRankedWinEditor";
const registration = { player_id: "100", round_id: 12, nickname: "Player", positions: "1/5",
  primary_wins: 20, secondary_wins: 10, wins_source: "manual" } as SeasonRoundRegistration;
beforeEach(() => { state.isOrganizer = true; state.isDeveloper = true; });
it("shows the reset action inside the settings dialog for a manually locked developer", () => {
  const markup = renderToStaticMarkup(<SeasonRankedWinEditor registration={registration} />);
  expect(markup).toContain("Отменить ручное внесение");
  expect(markup.indexOf("<dialog")).toBeLessThan(markup.indexOf("Отменить ручное внесение"));
});
it("hides organizer controls from a player", () => {
  state.isOrganizer = false;
  expect(renderToStaticMarkup(<SeasonRankedWinEditor registration={registration} />)).toBe("");
});
it.each(["stratz", "dotabuff", null] as const)("does not offer a manual reset for source %s", (source) => {
  expect(renderToStaticMarkup(<SeasonRankedWinEditor registration={{ ...registration, wins_source: source }} />))
    .not.toContain("Отменить ручное внесение");
});

it("keeps the gear but hides manual reset from another organizer", () => {
  state.isDeveloper = false;
  const markup = renderToStaticMarkup(<SeasonRankedWinEditor registration={registration} />);
  expect(markup).toContain("season-ranked-win-settings");
  expect(markup).not.toContain("Отменить ручное внесение");
});
