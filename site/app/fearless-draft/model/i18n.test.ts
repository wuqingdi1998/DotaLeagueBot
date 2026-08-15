import { describe, expect, it } from "vitest";
import { DRAFT_TRANSLATIONS, translateDraftError } from "./i18n";

describe("Fearless Draft translations", () => {
  it("keeps identical translation keys for Russian and English", () => {
    expect(Object.keys(DRAFT_TRANSLATIONS.en).sort()).toEqual(
      Object.keys(DRAFT_TRANSLATIONS.ru).sort(),
    );
  });

  it("translates interface actions while leaving data values outside the dictionary", () => {
    expect(DRAFT_TRANSLATIONS.ru.pick).toBe("ПИК");
    expect(DRAFT_TRANSLATIONS.en.pick).toBe("PICK");
    expect(DRAFT_TRANSLATIONS.ru.radiant).toBe("СВЕТ");
    expect(DRAFT_TRANSLATIONS.en.radiant).toBe("RADIANT");
    expect(JSON.stringify(DRAFT_TRANSLATIONS)).not.toContain('"BO2"');
    expect(JSON.stringify(DRAFT_TRANSLATIONS)).not.toContain('"BO3"');
  });

  it("translates known server errors only for the English interface", () => {
    const message = "Сейчас ход соперника";
    expect(translateDraftError(message, "ru")).toBe(message);
    expect(translateDraftError(message, "en")).toBe("It is your opponent's turn");
    expect(translateDraftError("Unknown server response", "en")).toBe(
      "Unknown server response",
    );
  });
});
