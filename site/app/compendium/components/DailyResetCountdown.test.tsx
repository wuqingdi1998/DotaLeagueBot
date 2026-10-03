import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMPENDIUM_HEROES } from "../model/heroes";
import { QuestCard } from "./QuestCard";

function unavailable() { throw new Error("Completed card actions must stay unavailable"); }

describe("completed daily quest reset countdown", () => {
  it("shows the Moscow server reset timer inside a completed card", () => {
    const html = renderToStaticMarkup(
      <QuestCard
        quest={{
          id: "completed-quest",
          position: 1,
          heroes: COMPENDIUM_HEROES.slice(0, 6),
          completion: {
            matchedHeroId: COMPENDIUM_HEROES[0].id,
            matchedMatchId: "123456",
            completedAt: "2026-10-03T09:00:00.000Z",
            isManual: false,
          },
        }}
        rewardStars={2}
        isChecking={false}
        isRerolling={false}
        canCheck={false}
        hasReroll={false}
        canReroll={false}
        onCheck={unavailable}
        onReroll={unavailable}
        resetCountdown="11:22:33"
      />,
    );

    expect(html).toContain("Задание выполнено");
    expect(html).toContain("До обновления задания");
    expect(html).toContain("11:22:33");
    expect(html).toContain("00:00 МСК по серверному времени");
  });
});
