import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { queueCompletedSeasonRoundResultsAnnouncement } from "./round-results-announcement";

describe("completed season round result announcement", () => {
  it("queues one configured post only after every match in the round is complete", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await queueCompletedSeasonRoundResultsAnnouncement(
      { query } as unknown as PoolClient,
      42,
    );

    expect(query).toHaveBeenCalledOnce();
    const [sql, values] = query.mock.calls[0];
    expect(values).toEqual([42]);
    expect(sql).toContain("pending_match.status IS DISTINCT FROM 'completed'");
    expect(sql).toContain("round.round_number >= settings.first_round_number");
    expect(sql).toContain("ON CONFLICT (dedupe_key) DO NOTHING");
    expect(sql).toContain("?round=%s");
    expect(sql).toContain("/standings");
    expect(sql).not.toContain("@everyone");
  });
});
