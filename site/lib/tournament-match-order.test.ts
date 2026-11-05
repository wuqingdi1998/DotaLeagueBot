import { expect, it } from "vitest";
import { sortTournamentMatches } from "./tournament-match-order";
import { normalizeMatchScheduledAt } from "./match-scheduled-at";

it("orders group dates, group TBA, playoff dates and playoff TBA by dependencies", () => {
  const match = (id: number, side: string, date: string | null, next?: number) => ({ id, bracket_side: side, scheduled_at: date, winner_to_match_id: next });
  const rows = [match(9,"grand_final",null),match(8,"lower",null,9),match(7,"upper",null,8),
    match(6,"upper","2026-12-02"),match(5,"lower","2026-12-01"),match(4,"group",null),
    match(3,"group","2026-11-03"),match(2,"group","2026-11-01")];
  expect(sortTournamentMatches(rows).map(m=>m.id)).toEqual([2,3,4,5,6,7,8,9]);
  expect(rows[0].id).toBe(9);
});
it("keeps group TBA ahead of dated playoffs even when the playoff date is earlier", () => {
  expect(sortTournamentMatches([{id:1,scheduled_at:"2026-01-01",bracket_side:"upper"},{id:2,scheduled_at:null,bracket_side:"group"}]).map(m=>m.id)).toEqual([2,1]);
});
it.each([null,"","TBA","2026-11-30","2026-11-30T12:"])("normalizes missing date or time (%s) to TBA", value => {
  const body={scheduledAt:value};expect(normalizeMatchScheduledAt(body)).toBe(true);expect(body.scheduledAt).toBeNull();
});
it("retains omitted patch fields and rejects malformed dates", () => {
  const absent={};expect(normalizeMatchScheduledAt(absent)).toBe(true);expect(absent).toEqual({});
  expect(normalizeMatchScheduledAt({scheduledAt:"garbage"})).toBe(false);
  const known={scheduledAt:"2026-11-30T19:00"};expect(normalizeMatchScheduledAt(known)).toBe(true);
  expect(known.scheduledAt).toBe("2026-11-30T16:00:00.000Z");
});
