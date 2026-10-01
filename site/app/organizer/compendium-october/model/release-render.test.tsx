import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberDailyPreview } from "../sections/OctoberActivityPreview";

describe("October public release presentation", () => {
  it("keeps exactly two daily slots closed until 5 October at midnight", () => {
    const html = renderToStaticMarkup(
      <OctoberDailyPreview viewerDiscordId="viewer-1" isOpen={false} />,
    );
    expect(html.match(/class="compendium-quest october-locked-daily-quest"/g))
      .toHaveLength(2);
    expect(html.match(/Задание появится 5 октября в 00:00/g)).toHaveLength(2);
    expect(html).not.toContain("compendium-heroes");
    expect(html).not.toContain("october-clan-quest-emblem");
  });
});
