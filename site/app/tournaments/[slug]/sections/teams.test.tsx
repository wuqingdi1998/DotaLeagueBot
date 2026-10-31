import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { cupTournament } from "@/tests/cup-schedule-context";
import { ArchiveRosterEditor } from "../ArchiveRosterEditor";
import { TeamsPanel } from "./TeamsPanel";

const context = vi.hoisted(() => ({
  activeTab: "teams", approvedTeams: [], registrationAvailable: false,
  checkInWindow: null,
  data: {
    tournament: { ...{} as typeof cupTournament },
    applications: [{
      id: 1, team_name: "Команда", tag: "TEAM", status: "approved",
      selection_method: "", team_tier_total_snapshot: null as number | null,
      members: [{ name: "Игрок", role: "safe_lane", is_captain: true, tier_snapshot: 8 }],
    }],
  },
}));
vi.mock("../hooks/TournamentContext", () => ({ useTournament: () => context }));

beforeEach(() => {
  context.data.tournament = { ...cupTournament, show_tiers: true };
  context.data.applications[0].selection_method = "";
  context.data.applications[0].team_tier_total_snapshot = null;
});

it.each(["", "   "])("omits empty participation details (%j) while keeping player tiers", (method) => {
  context.data.applications[0].selection_method = method;
  const html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).not.toContain("team-archive-meta");
  expect(html).not.toContain("Тир команды:");
  expect(html).toContain("тир 8");
});

it("shows each optional detail independently, including a zero team total", () => {
  context.data.applications[0].selection_method = "Приглашение";
  let html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).toContain("Приглашение");
  expect(html).not.toContain("Тир команды:");
  context.data.applications[0].selection_method = "";
  context.data.applications[0].team_tier_total_snapshot = 0;
  html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).toContain("Тир команды: 0");
  expect(html).not.toContain("<span></span>");
  context.data.tournament.show_tiers = false;
  expect(renderToStaticMarkup(<TeamsPanel />)).not.toContain("team-archive-meta");
});

it("applies the two-column layout only to league cups", () => {
  expect(renderToStaticMarkup(<TeamsPanel />)).toContain("teams-grid-league-cup");
  context.data.tournament.tournament_type = "ordinary";
  expect(renderToStaticMarkup(<TeamsPanel />)).not.toContain("teams-grid-league-cup");
});

it("places the team name and smaller parenthesized tag together beside the avatar", () => {
  const html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).toContain('<div class="team-card-heading"><h3>Команда <small class="team-tag">(TEAM)</small></h3>');
  expect(html).not.toContain('<p class="team-tag">');
});

it.each([false, true])("allows empty editable participation details in the roster form, historical: %s", (isHistorical) => {
  const html = renderToStaticMarkup(<ArchiveRosterEditor
    tournamentId={52} isHistorical={isHistorical} onSaved={async () => {}} onMessage={() => {}} />);
  expect(html).toMatch(/Метод участия \(необязательно\)<\/span><input maxLength="80" value=""/);
  expect(html).toMatch(/Суммарный тир команды \(необязательно\)<\/span><input type="number" min="0" max="100" value=""/);
  expect(html).not.toContain("Регистрация");
});
