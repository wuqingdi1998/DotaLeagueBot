import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberDailyPreview } from "../sections/OctoberActivityPreview";
import { octoberDailyQuestSamples } from "./preview";

describe("October daily reroll display", () => {
  it("shows one shared starting reroll beside both live hero challenges", () => {
    const html = renderToStaticMarkup(
      <OctoberDailyPreview
        viewerDiscordId="viewer-1"
        initialData={{
          quests: octoberDailyQuestSamples(),
          rerollsRemaining: 1,
          clanOuting: null,
          runeChallenge: {
            hasAccess: false,
            accessRoleName: null,
            selection: null,
            completion: null,
          },
        }}
      />,
    );

    expect(html.match(/compendium-reroll-count/g)).toHaveLength(2);
    expect(html.match(/×1/g)).toHaveLength(2);
    expect(html.match(/class="compendium-reroll-button" type="button"/g)).toHaveLength(2);
  });
});
