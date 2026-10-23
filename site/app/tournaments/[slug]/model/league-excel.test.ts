import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import writeExcelFile from "write-excel-file/universal";
import { calculateSeasonStandings } from "@/lib/season";
import { leagueExcelSheets } from "./league-excel";

describe("league Excel export", () => {
  it("writes a real workbook, preserving published scores, text IDs and inactive players", async () => {
    const standings = calculateSeasonStandings([], [], [
      { playerId: "100", dotaId: "00123456789", nickname: "=Игрок & <1>", avatarUrl: null },
      { playerId: "200", dotaId: "200", nickname: "Неактивный", avatarUrl: null },
    ]);
    standings[0] = { ...standings[0], points: 7.5, winRate: 0.5, rounds: {
      "1": { points: 0, outcome: "loss", matchIds: [] },
      "2": { points: 3, outcome: "win", matchIds: [] },
    } };
    standings[1] = { ...standings[1], section: "inactive", inactiveReason: "Покинул сервер" };
    const sheets = leagueExcelSheets("Лига 9", { standings, rounds: [
      { round_kind: "regular", is_visible: false, round_number: 2 },
      { round_kind: "regular", is_visible: true, round_number: 1 },
      { round_kind: "finals", is_visible: true, round_number: 3 },
    ] });
    expect(sheets.map((sheet) => sheet.sheet)).toEqual(["Таблица лиги", "Вне общего зачёта"]);
    const blob = await writeExcelFile(sheets).toBlob();
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const shared = strFromU8(zip["xl/sharedStrings.xml"]);
    const main = strFromU8(zip["xl/worksheets/sheet1.xml"]);
    expect(shared).toContain("00123456789");
    expect(shared).toContain("=Игрок &amp; &lt;1&gt;");
    expect(shared).toContain("Тур 1");
    expect(shared).not.toContain("Тур 2");
    expect(shared).not.toContain("Тур 3");
    expect(shared).toContain("Покинул сервер");
    expect(main).toContain("<v>7.5</v>");
    expect(main).not.toContain("<f>");
    expect(main).toContain("<v>0</v>");
  });

  it("exports an empty league with column headings", () => {
    const sheets = leagueExcelSheets("Новая лига", { standings: [], rounds: [] });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].data).toHaveLength(3);
  });
});
