import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  new URL("../app/boosty/page.tsx", import.meta.url),
  "utf8",
);
const comparison = readFileSync(
  new URL("../app/boosty/components/BoostyBenefits.tsx", import.meta.url),
  "utf8",
);
const supporters = readFileSync(
  new URL("../app/boosty/components/SupporterGallery.tsx", import.meta.url),
  "utf8",
);
const plans = readFileSync(
  new URL("../app/boosty/model/boosty-plans.ts", import.meta.url),
  "utf8",
);
const subscriptionRoles = readFileSync(
  new URL("./subscription-roles.ts", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../app/styles/30-boosty.css", import.meta.url),
  "utf8",
);

describe("Boosty page", () => {
  it("offers the external Boosty action and all subscription levels", () => {
    expect(page).toContain("BoostyPage");
    expect(comparison).toContain("Перейти на Boosty");
    expect(comparison).toContain("boostyUrl");
    for (const role of [
      "Руна Воды",
      "Руна Регенерации",
      "Руна Иллюзий",
      "Руна Волшебства",
      "Руна Невидимости",
      "Руна Ускорения",
      "Руна Усиления урона",
      "Суппортеры",
    ]) {
      expect(plans).toContain(role);
    }
  });

  it("renders supporters from the exact Discord role", () => {
    expect(supporters).toContain("Наши суппортеры");
    expect(subscriptionRoles).toContain("1506420703254286478");
  });

  it("switches the wide comparison to cards on smaller screens", () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*\.boosty-benefits-matrix\s*\{[^}]*display:\s*none;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*\.boosty-plan-cards\s*\{[^}]*display:\s*grid;/,
    );
  });
});
