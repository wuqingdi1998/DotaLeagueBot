import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  new URL(
    "../app/tournaments/[slug]/admin/MatchResultsList.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("match editor performance contract", () => {
  it("mounts the heavy editor only for the currently opened match", () => {
    expect(source).toContain("const [openMatchId, setOpenMatchId]");
    expect(source).toContain("open={openMatchId === match.id}");
    expect(source).toContain("{openMatchId === match.id && (");
  });
});
