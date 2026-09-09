import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const choices = source("app/fearless-draft/sections/DraftChoices.tsx");
const choiceParticipant = source(
  "app/fearless-draft/components/DraftChoiceParticipant.tsx",
);
const styles = source("app/styles/50-fearless-draft.css");

describe("Fearless Draft choice stage", () => {
  it("shows both chooser positions and their decisions", () => {
    expect(choices).toContain("<DraftChoiceParticipant");
    expect(choices).toContain("text.choosesFirst");
    expect(choices).toContain("text.choosesSecond");
    expect(choices).toContain("map.firstChoice");
    expect(choices).toContain("map.secondChoice");
    expect(choiceParticipant).toContain('alignment: "left" | "right"');
    expect(choiceParticipant).toContain("choiceLabel");
    expect(styles).toContain(".fearless-choice-participants");
    expect(styles).toContain(".fearless-choice-screen { box-sizing: border-box; }");
  });

  it("calls a teammate the viewer's captain while a choice is pending", () => {
    expect(choices).toContain("areDraftLobbyTeammates");
    expect(choices).toContain("text.waitingCaptainDecision");
    expect(choices).toContain("text.waitingOpponentCaptainDecision");
  });
});
