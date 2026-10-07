import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompendiumLeaderboard } from "./CompendiumLeaderboard";

describe("leaderboard race conditions", () => {
  it("keeps the complete race description inside a closed disclosure before the standings", () => {
    const html = renderToStaticMarkup(
      <CompendiumLeaderboard participants={[]} title="Гонка" description="Правила и награды" descriptionLabel="Условия гонки" />,
    );
    expect(html).toContain('<details class="compendium-leaderboard-rules">');
    expect(html).toMatch(/<summary>.*Условия гонки.*<\/summary><p>Правила и награды<\/p><\/details>/);
    expect(html.indexOf("</details>")).toBeLessThan(html.indexOf('role="table"'));
    expect(html).not.toMatch(/<details[^>]*\sopen(?:\s|=|>)/);
  });

  it("keeps the ordinary compendium leaderboard description visible", () => {
    const html = renderToStaticMarkup(<CompendiumLeaderboard participants={[]} />);
    expect(html).toContain("Звёзды, заработанные за всё время ивента.");
    expect(html).not.toContain("<details");
  });
});
