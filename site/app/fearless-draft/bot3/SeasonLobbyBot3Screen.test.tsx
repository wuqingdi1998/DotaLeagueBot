import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SeasonLobbyBot3Screen } from "./SeasonLobbyBot3Screen";
import { buildBot3Room } from "../model/bot3-room";
import { startBot3CaptainSelection, answerBot3Captain, advanceBot3Captains } from "../model/bot3-captains";
import type { FearlessDraftSnapshot } from "../model/snapshot";

vi.mock("../hooks/useFearlessDraft", () => ({ useFearlessDraft: (snapshot: FearlessDraftSnapshot) => ({
  snapshot, isSending: false, error: "", isConnected: true, send: async () => true,
}) }));

it("uses the live captain interface and roles in Bot3 without displaying the draft too early", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  const players = Array.from({ length: 10 }, (_, index) => ({
    id: String(index), dotaId: String(index + 100), name: `Участник ${index + 1}`,
    serverName: `Участник ${index + 1}`, avatarUrl: null,
    teamSide: index < 5 ? "a" as const : "b" as const, isOnline: true, tier: 5, positions: "3/4",
  }));
  const state = startBot3CaptainSelection(buildBot3Room(players, "0", 1, new Date(now).toISOString()), now, () => 0.5);
  const draft: FearlessDraftSnapshot = {
    serverNow: new Date(now).toISOString(), user: { id: "0", name: "Участник 1", discordName: "Участник 1", avatarUrl: null },
    isOrganizer: false, isWaiting: false, waitingPlayers: [], invitations: [], lobbyPlayers: players,
    series: { id: 1, format: "BO3", status: "CHOOSING", currentMap: 1, isLobbyPreview: true,
      isSeasonLobbyPreview: true, endRequest: null } as FearlessDraftSnapshot["series"], bot3Room: state.room,
  };
  const directory = new URL("../../../.data/bot3-layout/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const styles = new URL("../../styles/", import.meta.url);
  const draftStyleNames = [...readFileSync(new URL("fearless-draft-route.css", styles), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1]);
  const css = ["01-foundation.css", ...draftStyleNames, "60-season-lobby-entry-and-shell.css", "60-season-lobby-room.css", "60-season-captain-voting.css"]
    .map((name) => readFileSync(new URL(name, styles), "utf8")).join("\n") +
    readFileSync(new URL("../../components/PlayerRoleBadge.module.css", import.meta.url), "utf8").replaceAll(".badge", '[aria-label^="Игровые позиции"]');
  function save(name: string) {
    const html = renderToStaticMarkup(<SeasonLobbyBot3Screen initialDraft={draft} />);
    expect(html).not.toContain('class="season-room-draft"');
    expect(html.match(/aria-label="Игровые позиции: 3\/4"/g)?.length).toBeGreaterThanOrEqual(10);
    writeFileSync(new URL(`${name}.html`, directory), `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="site-shell" data-theme="dark">${html}</div>`);
    return html;
  }
  expect(save("interest")).toContain("Да, хочу");
  answerBot3Captain(state, "BOT3_CAPTAIN_INTEREST", true);
  const accepted = save("accepted");
  expect(accepted).toContain("Вы хотите быть капитаном</strong>");
  expect(accepted).not.toContain("Да, хочу");
  state.room.players[0].wantsCaptain = false;
  advanceBot3Captains(state, now + 30_000, () => 0.1);
  state.room.serverNow = new Date(now + 30_000).toISOString();
  expect(save("voting")).toContain("Вы выбираете капитана");
});
