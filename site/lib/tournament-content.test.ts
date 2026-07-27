import { describe, expect, it } from "vitest";
import {
  normalizePrizes,
  prizeValidationError,
} from "./tournament-content";

describe("tournament prize places", () => {
  it("allows places and rewards to be saved before teams are known", () => {
    const prizes = normalizePrizes([
      { placement: 1, prizeText: "4 000 ₽" },
      { placement: 2 },
      { placement: 3 },
    ]);

    expect(prizeValidationError(prizes)).toBeNull();
    expect(prizes.map((prize) => prize.applicationId)).toEqual([
      null,
      null,
      null,
    ]);
    expect(prizes.map((prize) => prize.teamName)).toEqual([null, null, null]);
  });

  it("still rejects invalid and duplicate place numbers", () => {
    expect(
      prizeValidationError(
        normalizePrizes([{ placement: 1 }, { placement: 1 }]),
      ),
    ).toBe("Одно место нельзя указать дважды");
    expect(prizeValidationError(normalizePrizes([{ placement: 0 }]))).toContain(
      "от 1 до 64",
    );
  });
});
