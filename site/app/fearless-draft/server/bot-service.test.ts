import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ one: vi.fn(), query: vi.fn(), transaction: vi.fn(),
  isBotActionDue: vi.fn(), clearBotActionDue: vi.fn(), processBot3Captains: vi.fn(),
  makeDraftChoice: vi.fn(), selectDraftHero: vi.fn(), ready: vi.fn(), respond: vi.fn(), submit: vi.fn(),
}));
vi.mock("@/lib/db", () => mocks);
vi.mock("./bot-timing-service", () => mocks);
vi.mock("./bot3-captain-service", () => ({ ...mocks, createBot3Captains: vi.fn() }));
vi.mock("./series-service", () => mocks);
vi.mock("./agreement-service", () => ({ markReadyForNextDraftMap: mocks.ready, respondToDraftSeriesEnd: mocks.respond }));
vi.mock("./lineup-assignment-service", () => ({ submitDraftLineupAssignment: mocks.submit }));
import { advanceBotDraft } from "./bot-service";
import { FEARLESS_DRAFT_BOT_PLAYER_ID as bot } from "../model/bot";

let state: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  state = { series_id: 1, player1_id: "1", player2_id: bot, status: "CHOOSING",
    map_id: 1, map_status: "FIRST_DECISION", first_chooser_id: bot, first_choice: null,
    first_pick_player_id: bot, current_step: 0, version: 0, is_season_lobby_preview: true,
    step_started_at: new Date("2026-10-09T12:00:00Z"), bot_lineup_submitted: false,
  };
  mocks.one.mockImplementation(async () => ({ ...state }));
  mocks.query.mockResolvedValue([]);
  mocks.processBot3Captains.mockResolvedValue(false);
  mocks.isBotActionDue.mockResolvedValue(false);
  mocks.clearBotActionDue.mockResolvedValue(undefined);
  mocks.makeDraftChoice.mockImplementation(async () => { state.map_status = "SECOND_DECISION"; });
  mocks.selectDraftHero.mockImplementation(async () => { state.current_step = 2; });
});

it("waits for the saved Bot3 decision time and then takes exactly one valid choice", async () => {
  await advanceBotDraft("1");
  expect(mocks.makeDraftChoice).not.toHaveBeenCalled();
  mocks.isBotActionDue.mockResolvedValue(true);
  await advanceBotDraft("1");
  expect(mocks.makeDraftChoice).toHaveBeenCalledOnce();
  expect(mocks.clearBotActionDue).toHaveBeenCalledWith(1, expect.any(String));
});

it("does not start the draft until captain selection finishes", async () => {
  mocks.processBot3Captains.mockResolvedValue(true);
  mocks.isBotActionDue.mockResolvedValue(true);
  await advanceBotDraft("1");
  expect(mocks.makeDraftChoice).not.toHaveBeenCalled();
  expect(mocks.isBotActionDue).not.toHaveBeenCalled();
});

it("bounds a Bot3 ban by the actual turn timer and preserves normal hero selection", async () => {
  state.map_status = "DRAFTING";
  state.status = "DRAFTING";
  await advanceBotDraft("1");
  expect(mocks.isBotActionDue).toHaveBeenCalledWith(1, expect.any(String), new Date("2026-10-09T12:00:15Z"));
  expect(mocks.selectDraftHero).not.toHaveBeenCalled();
  mocks.isBotActionDue.mockResolvedValue(true);
  await advanceBotDraft("1");
  expect(mocks.selectDraftHero).toHaveBeenCalledWith(bot, expect.any(Number), 0, true, "1");
});

it("does not repeat a confirmed lineup or change Bot1 and Bot2 timing", async () => {
  state.map_status = "LINEUP_ASSIGNMENT";
  state.bot_lineup_submitted = true;
  await advanceBotDraft("1");
  expect(mocks.isBotActionDue).not.toHaveBeenCalled();
  state.map_status = "FIRST_DECISION";
  state.is_season_lobby_preview = false;
  await advanceBotDraft("1");
  expect(mocks.makeDraftChoice).toHaveBeenCalledOnce();
  expect(mocks.isBotActionDue).not.toHaveBeenCalled();
});

it("clears a cancelled reply while waiting for the human or captain stage", async () => {
  state.first_chooser_id = "1";
  await advanceBotDraft("1");
  expect(mocks.clearBotActionDue).toHaveBeenCalledWith(1);
  expect(mocks.isBotActionDue).not.toHaveBeenCalled();
  mocks.processBot3Captains.mockResolvedValue(true);
  await advanceBotDraft("1");
  expect(mocks.clearBotActionDue).toHaveBeenCalledTimes(2);
});
