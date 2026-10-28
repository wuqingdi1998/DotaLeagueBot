import { describe, expect, it } from "vitest";
import {
  createCupBoard, cupBasketTierTotal, cupBoardPlayerIds, moveCupPlayer, parseCupBoard,
  removeCupPlayer, toggleCupReadiness, type CupPlayer,
} from "./cup-board";

const players: CupPlayer[] = [1, 2, 3, 4].map((id) => ({
  id: String(id), nickname: `Игрок ${id}`, tier: id, positions: "1/2", matchCount: id,
}));

describe("cup constructor independent slots", () => {
  it("initially includes exactly two matches and more; an empty saved list stays empty", () => {
    expect(createCupBoard(players).pool).toEqual(["2", "3", "4"]);
    expect(parseCupBoard(createCupBoard([]))?.pool).toEqual([]);
  });

  it("fills sixth, third and first separately and excludes sixth from the sum", () => {
    let board = createCupBoard(players);
    board = moveCupPlayer(board, "4", { basket: 0, slot: 5 });
    board = moveCupPlayer(board, "3", { basket: 0, slot: 2 });
    board = moveCupPlayer(board, "2", { basket: 0, slot: 0 });
    expect(board.baskets[0]).toEqual(["2", null, "3", null, null, "4"]);
    expect(cupBasketTierTotal(board.baskets[0], new Map(players.map((p) => [p.id, p])))).toEqual({ total: 5, unknown: 0 });
    expect(parseCupBoard(JSON.parse(JSON.stringify(board)))).toEqual(board);
  });

  it("swaps within baskets, between baskets and with the pool without duplicate players", () => {
    let board = moveCupPlayer(createCupBoard(players), "2", { basket: 0, slot: 5 });
    board = moveCupPlayer(board, "3", { basket: 1, slot: 1 });
    board = moveCupPlayer(board, "2", { basket: 1, slot: 1 });
    expect(board.baskets[0][5]).toBe("3");
    expect(board.baskets[1][1]).toBe("2");
    board = moveCupPlayer(board, "4", { basket: 0, slot: 5 });
    expect(board.pool).toEqual(["3"]);
    board = moveCupPlayer(board, "2", { basket: 1, slot: 5 });
    expect(board.baskets[1][1]).toBeNull();
    expect(board.baskets[1][5]).toBe("2");
    expect(cupBoardPlayerIds(board).sort()).toEqual(["2", "3", "4"]);
  });

  it("reorders the pool and returns players from a precise basket slot", () => {
    let board = moveCupPlayer(createCupBoard(players), "4", { poolIndex: 0 });
    expect(board.pool).toEqual(["4", "2", "3"]);
    board = moveCupPlayer(board, "4", { poolIndex: 3 });
    expect(board.pool).toEqual(["2", "3", "4"]);
    board = moveCupPlayer(board, "3", { basket: 2, slot: 3 });
    board = moveCupPlayer(board, "3", { poolIndex: 0 });
    expect(board.pool).toEqual(["3", "2", "4"]);
    expect(board.baskets[2][3]).toBeNull();
  });

  it("toggles readiness twice, carries it with the player, and removes it on deletion", () => {
    const initial = createCupBoard(players);
    let board = toggleCupReadiness(initial, "2");
    expect(board.readyPlayerIds).toEqual(["2"]);
    expect(toggleCupReadiness(board, "2").readyPlayerIds).toEqual([]);
    board = moveCupPlayer(board, "2", { basket: 0, slot: 4 });
    expect(board.readyPlayerIds).toEqual(["2"]);
    board = removeCupPlayer(board, "2");
    expect(board.readyPlayerIds).toEqual([]);
    expect(board.baskets[0][4]).toBeNull();
    expect(initial.pool).toEqual(["2", "3", "4"]);
  });

  it("rejects duplicate players, wrong slot counts and readiness outside the board", () => {
    const board = createCupBoard(players);
    expect(parseCupBoard({ ...board, pool: ["2", "2"] })).toBeNull();
    expect(parseCupBoard({ ...board, readyPlayerIds: ["1"] })).toBeNull();
    expect(parseCupBoard({ ...board, baskets: [["2"]] })).toBeNull();
    expect(parseCupBoard({ ...board, pool: ["not-an-id"] })).toBeNull();
    expect(moveCupPlayer(board, "2", { basket: 4, slot: 0 })).toBe(board);
    expect(moveCupPlayer(board, "100", { basket: 0, slot: 0 })).toBe(board);
  });
});
