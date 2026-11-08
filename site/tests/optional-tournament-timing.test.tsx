import { PGlite } from "@electric-sql/pglite";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { POST } from "../app/api/tournament/tournament-create";
import { PATCH } from "../app/api/tournament/tournament-update";
import { emptyTournament } from "../app/tournaments/hub/tournament-hub-model";
import { OverviewPanel } from "../app/tournaments/[slug]/sections/OverviewPanel";
import { TournamentDetailsEditor } from "../app/tournaments/[slug]/admin/TournamentDetailsEditor";

let database: PGlite;
vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => ({ actorDiscordId: null }),
  responseFromAuthError: (error: unknown) => { throw error; },
}));
vi.mock("@/lib/db", () => ({ transaction: async (callback: (client: {
  query: (sql: string, values: unknown[]) => Promise<unknown>;
}) => Promise<unknown>) => database.transaction(async (tx) => callback({ query: async (sql, values) => {
  const result = await tx.query(sql, values);
  return { rows: result.rows, rowCount: result.affectedRows };
} })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const context = vi.hoisted(() => ({
  activeTab: "overview", checkInWindow: null,
  data: { tournament: {}, scheduleDays: [{ id: 1, title: "День 1", day_date: "2026-06-26",
    entries: [{ id: 1, start_time: "20:00", stage_name: "Групповой этап · Раунд 1", match_count: 2, series_format: "BO1" }] }], prizes: [] },
}));
vi.mock("../app/tournaments/[slug]/hooks/TournamentContext", () => ({ useTournament: () => context }));

const body = {
  ...emptyTournament, slug: "optional-time", name: "Архивный турнир", headline: "Архивный турнир",
  headline_accent: "26.06.2026 – 28.06.2026",
  about: "Даты проведения подтверждены; отдельные отметки не указаны.", description: "Архив",
  start_at: "2026-06-26T20:00:00+03:00", end_at: "2026-06-28T23:59:00+03:00",
  format: "5 × 5", group_format: "Общая группа", final_format: "BO3", status_label: "Архив",
  registration_deadline: null, registration_starts_at: null, check_in_minutes: null,
  show_start_in_overview: false,
};
const request = (method: string, values: Record<string, unknown>) => new Request("https://example.test/api/tournament", {
  method, headers: { "content-type": "application/json" }, body: JSON.stringify(values),
});
beforeAll(async () => {
  database = new PGlite();
  await database.exec(readFileSync(new URL("./fixtures/selected-archive-schema.sql", import.meta.url), "utf8"));
  await database.exec(readFileSync(new URL("../../bot/database/migrations/0199_optional_tournament_timing.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await database?.close(); });

it("creates a tournament with empty timing, saves explicit values, and clears them again", async () => {
  const response = await POST(request("POST", body));
  expect(response.status, await response.clone().text()).toBe(201);
  const { id } = await response.json();
  const known = { ...body, id, registration_deadline: "2026-06-25T20:00:00+03:00",
    check_in_minutes: 60, show_start_in_overview: true };
  expect((await PATCH(request("PATCH", known))).status).toBe(200);
  let row = (await database.query<Record<string, unknown>>("SELECT * FROM tournaments WHERE id=$1", [id])).rows[0];
  expect(row.check_in_minutes).toBe(60);
  expect(row.registration_deadline).not.toBeNull();
  expect((await PATCH(request("PATCH", { ...known, registration_deadline: "", registration_starts_at: "",
    check_in_minutes: "", show_start_in_overview: false }))).status).toBe(200);
  row = (await database.query<Record<string, unknown>>("SELECT * FROM tournaments WHERE id=$1", [id])).rows[0];
  expect(row.registration_deadline).toBeNull();
  expect(row.registration_starts_at).toBeNull();
  expect(row.check_in_minutes).toBeNull();
  expect(row.show_start_in_overview).toBe(false);
  expect((row.start_at as Date).toISOString()).toBe("2026-06-26T17:00:00.000Z");
});

it("renders no invented timing on the overview and leaves editable inputs empty", () => {
  context.data.tournament = body;
  const overview = renderToStaticMarkup(<OverviewPanel />);
  expect(overview).not.toContain("stage-flow");
  for (const label of ["Регистрация до", "Старт турнира", "Чек-ин"]) expect(overview).not.toContain(label);
  expect(overview).toContain("Расписание турнира");
  expect(overview).toContain("26.06.2026 – 28.06.2026");
  expect(overview).toContain("20:00");
  const editor = renderToStaticMarkup(<TournamentDetailsEditor
    tournament={{ ...body, id: 1 } as Parameters<typeof TournamentDetailsEditor>[0]["tournament"]}
    onSaved={async () => {}} onMessage={() => {}} />);
  expect(editor).toContain('placeholder="Не указан" value=""');
  expect(editor).toContain("Показывать старт турнира в обзоре");
  if (process.env.OPTIONAL_TIMING_PREVIEW === "1") {
    mkdirSync(new URL("../.data/optional-timing/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../.data/optional-timing/overview.html", import.meta.url), overview);
    writeFileSync(new URL("../.data/optional-timing/editor.html", import.meta.url), editor);
  }
});
