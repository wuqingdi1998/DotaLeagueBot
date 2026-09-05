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
const hero = readFileSync(
  new URL("../app/boosty/components/BoostyHero.tsx", import.meta.url),
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
const header = readFileSync(
  new URL("../app/components/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const headerStyles = readFileSync(
  new URL("../app/styles/02-site-header.css", import.meta.url),
  "utf8",
);

describe("Boosty page", () => {
  it("offers the external Boosty action and all subscription levels", () => {
    expect(page).toContain("BoostyPage");
    expect(comparison).toContain("Перейти на Boosty");
    expect(comparison).toContain("boostyUrl");
    expect(comparison.indexOf("Сравнение преимуществ")).toBeLessThan(
      comparison.indexOf("Перейти на Boosty"),
    );
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
    expect(hero).toContain("SupporterGallery");
    expect(hero).toContain(
      "Поддержи сервер и наши турниры - получи приятные преимущества!",
    );
    expect(hero).toContain(
      "дополнительные возможности в ходе 9-го сезона",
    );
    expect(hero).not.toContain("Поддержка сообщества");
    expect(subscriptionRoles).toContain("1506420703254286478");
  });

  it("reuses the header Boosty button colors", () => {
    expect(header).toContain('className="boosty-button boosty-action-button"');
    expect(comparison).toContain(
      'className="boosty-external-button boosty-action-button"',
    );
    expect(headerStyles).toMatch(
      /\.boosty-action-button\s*\{[^}]*background:\s*rgba\(241, 95, 44, 0\.12\);[^}]*color:\s*#e65322;/,
    );
    expect(headerStyles).toMatch(
      /\.boosty-action-button:hover\s*\{[^}]*background:\s*#f15f2c;[^}]*color:\s*#fff;/,
    );
  });

  it("switches the wide comparison to cards on smaller screens", () => {
    expect(styles).not.toContain(".boosty-hero::after");
    expect(styles).toMatch(
      /\.boosty-hero-content\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(300px, 0\.62fr\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*\.boosty-benefits-matrix\s*\{[^}]*display:\s*none;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*\.boosty-plan-cards\s*\{[^}]*display:\s*grid;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*\.boosty-hero-content\s*\{[^}]*grid-template-columns:\s*1fr;/,
    );
  });
});
