import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const seasonAdminPanel = source(
  "../app/tournaments/[slug]/admin/SeasonAdminPanel.tsx",
);
const seasonRoundActions = source(
  "../app/api/admin/season/season-round-actions.ts",
);

describe("season round count editor", () => {
  it("keeps an empty input editable instead of converting it to zero", () => {
    expect(seasonAdminPanel).toContain(
      "setRoundCountInput(event.target.value)",
    );
    expect(seasonAdminPanel).not.toContain(
      "setRoundCount(Number(event.target.value))",
    );
  });

  it("sends only a valid round count", () => {
    expect(seasonAdminPanel).toContain(
      "validSeasonRoundCount(roundCount)",
    );
    expect(seasonAdminPanel).toContain("disabled={!isRoundCountValid}");
  });

  it("uses separate numeric and text parameters in the audit record", () => {
    expect(seasonRoundActions).not.toContain("$1::text");
    expect(seasonRoundActions).toMatch(
      /\[\s*tournamentId,\s*actorDiscordId,\s*String\(tournamentId\)/,
    );
  });
});
