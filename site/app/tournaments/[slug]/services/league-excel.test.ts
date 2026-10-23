import { afterEach, expect, it, vi } from "vitest";
import { downloadLeagueExcel } from "./league-excel";

afterEach(() => vi.unstubAllGlobals());

it("refuses a download after organizer access has expired", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ isOrganizer: false })));
  await expect(downloadLeagueExcel("лига", "Лига")).rejects.toThrow("Необходим доступ организатора");
});

it("does not download an error response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Не найдено" }, { status: 404 })));
  await expect(downloadLeagueExcel("missing", "Лига")).rejects.toThrow("Не удалось загрузить");
});
