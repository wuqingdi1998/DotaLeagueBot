import { describe, expect, it } from "vitest";
import { tournamentTextFields } from "./tournament-form";

describe("tournament form fields", () => {
  it("keeps creation and editing fields in one canonical order", () => {
    expect(tournamentTextFields.map((field) => field.field)).toEqual([
      "slug",
      "name",
      "eyebrow",
      "status_label",
      "headline",
      "headline_accent",
      "description",
      "about",
      "format",
      "region",
      "server",
      "group_format",
      "playoff_format",
      "final_format",
      "discord_url",
    ]);
  });

  it("uses the agreed labels for previously inconsistent fields", () => {
    const labels = Object.fromEntries(
      tournamentTextFields.map((field) => [field.field, field.label]),
    );

    expect(labels.slug).toBe("Адрес латиницей");
    expect(labels.status_label).toBe("Видимый статус");
    expect(labels.headline_accent).toBe("Выделенная часть заголовка");
  });
});
