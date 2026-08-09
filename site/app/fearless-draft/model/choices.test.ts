import { describe, expect, it } from "vitest";
import { applyFirstChoice, completeDraftAssignments } from "./choices";

describe("Fearless Draft side and priority choices", () => {
  it.each(["RADIANT", "DIRE"] as const)(
    "keeps side independent when the first chooser selects %s",
    (choice) => {
      const partial = applyFirstChoice("winner", "opponent", choice);
      const assignments = completeDraftAssignments(partial, "SECOND");
      expect(assignments.winner.side).toBe(choice);
      expect(assignments.opponent.side).not.toBe(choice);
      expect(assignments.opponent.priority).toBe("SECOND");
      expect(assignments.winner.priority).toBe("FIRST");
    },
  );

  it.each(["FIRST", "SECOND"] as const)(
    "keeps priority independent when the first chooser selects %s",
    (choice) => {
      const partial = applyFirstChoice("winner", "opponent", choice);
      const assignments = completeDraftAssignments(partial, "DIRE");
      expect(assignments.winner.priority).toBe(choice);
      expect(assignments.opponent.priority).not.toBe(choice);
      expect(assignments.opponent.side).toBe("DIRE");
      expect(assignments.winner.side).toBe("RADIANT");
    },
  );
});
