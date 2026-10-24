import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { compendiumClanResults } from "./clan-results";
import { CompendiumClanResults } from "../sections/CompendiumClanResults";

it.each([[687, 669, "winner", "loser"], [600, 700, "loser", "winner"], [700, 700, "tie", "tie"]] as const)(
  "announces final clan outcomes for %s and %s stars", (morbus, panacea, first, second) => {
    const clans = compendiumClanResults([{ clan_id: "morbus", stars: morbus }, { clan_id: "panacea", stars: panacea }], true);
    expect(clans.map((clan) => clan.outcome)).toEqual([first, second]);
    const html = renderToStaticMarkup(<CompendiumClanResults clans={clans} isFinished />);
    expect(html).toContain("Морбус");
    expect(html).toContain("Панацея");
    expect(html).toContain(String(morbus));
    expect(html).toContain(String(panacea));
    if (first === "tie") expect(html).toContain("Ничья");
    else { expect(html).toContain("Победивший клан"); expect(html).toContain("Проигравший клан"); }
  },
);

it("shows preliminary totals without declaring a winner before league settlement", () => {
  const clans = compendiumClanResults([{ clan_id: "morbus", stars: 900 }], false);
  expect(clans.map((clan) => clan.outcome)).toEqual(["pending", "pending"]);
  expect(clans[1].stars).toBe(0);
  const html = renderToStaticMarkup(<CompendiumClanResults clans={clans} isFinished={false} />);
  expect(html).not.toContain("Победивший");
  expect(html).not.toContain("Проигравший");
  expect(html).toContain("после завершения 9-го тура");
});
