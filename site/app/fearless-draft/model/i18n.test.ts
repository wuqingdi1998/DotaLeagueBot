import { describe, expect, it } from "vitest";
import { DRAFT_TRANSLATIONS, translateDraftError } from "./i18n";

describe("Fearless Draft translations", () => {
  it("keeps identical translation keys for Russian, English and Ukrainian", () => {
    expect(Object.keys(DRAFT_TRANSLATIONS.en).sort()).toEqual(
      Object.keys(DRAFT_TRANSLATIONS.ru).sort(),
    );
    expect(Object.keys(DRAFT_TRANSLATIONS.uk).sort()).toEqual(
      Object.keys(DRAFT_TRANSLATIONS.ru).sort(),
    );
  });

  it("translates interface actions while leaving data values outside the dictionary", () => {
    expect(DRAFT_TRANSLATIONS.ru.pick).toBe("ПИК");
    expect(DRAFT_TRANSLATIONS.en.pick).toBe("PICK");
    expect(DRAFT_TRANSLATIONS.uk.pick).toBe("ПІК");
    expect(DRAFT_TRANSLATIONS.ru.radiant).toBe("СВЕТ");
    expect(DRAFT_TRANSLATIONS.en.radiant).toBe("RADIANT");
    expect(DRAFT_TRANSLATIONS.uk.radiant).toBe("СВІТЛО");
    expect(JSON.stringify(DRAFT_TRANSLATIONS)).not.toContain('"BO2"');
    expect(JSON.stringify(DRAFT_TRANSLATIONS)).not.toContain('"BO3"');
  });

  it("translates known server errors for English and Ukrainian", () => {
    const message = "Сейчас ход соперника";
    expect(translateDraftError(message, "ru")).toBe(message);
    expect(translateDraftError(message, "en")).toBe("It is your opponent's turn");
    expect(translateDraftError(message, "uk")).toBe("Зараз хід суперника");
    expect(translateDraftError("Unknown server response", "en")).toBe(
      "Unknown server response",
    );
    expect(translateDraftError("Unknown server response", "uk")).toBe(
      "Unknown server response",
    );
  });
});
