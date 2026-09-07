import { describe, expect, it } from "vitest";
import { parseRankedWinUpdate } from "./organizer-model";

const update = { roundId: 3, playerId: "123456789012345678", source: "manual", positions: "1/5", primaryWins: 10, secondaryWins: 0 };

describe("organizer ranked win input", () => {
  it("accepts two counts including zero", () => {
    expect(parseRankedWinUpdate(update)).toEqual(update);
  });
  it.each([-1, 1.5, 32768, null, "10", true, undefined, NaN, Infinity])("rejects invalid count %s", (value) => {
    expect(parseRankedWinUpdate({ ...update, primaryWins: value })).toBeNull();
    expect(parseRankedWinUpdate({ ...update, secondaryWins: value })).toBeNull();
  });
  it.each([{}, null, [], { ...update, playerId: "9223372036854775808" },
    { ...update, roundId: 0 }, { ...update, source: "unknown" },
    { ...update, positions: "1/1" }, { ...update, positions: "1/6" }])("rejects malformed request", (body) => {
    expect(parseRankedWinUpdate(body)).toBeNull();
  });
  it("accepts a Stratz refresh without manual counts", () => {
    expect(parseRankedWinUpdate({ ...update, source: "stratz", primaryWins: undefined, secondaryWins: undefined })).toMatchObject({ source: "stratz" });
  });
  it("rejects Dotabuff as an update source", () => {
    expect(parseRankedWinUpdate({ ...update, source: "dotabuff" })).toBeNull();
  });
});
