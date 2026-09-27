import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { ProfileEventBadge } from "@/app/components/ProfileEventBadge";
import { OctoberClanShowcase } from "../sections/OctoberClanShowcase";
import { OctoberClanOutingCard } from "../sections/OctoberClanOutingCard";
import { OctoberSectionNavigation } from "../components/OctoberSectionNavigation";
import { OCTOBER_CLANS } from "./clans";
import { OCTOBER_PREVIEW_SECTIONS } from "./sections";
import { octoberRewardsForStars } from "./rewards";
import { OCTOBER_RACE_EXCLUSION_RULES, octoberDailyQuestSamples } from "./preview";
import type { OctoberClanMember } from "./clan-members";

const previewStyles = readFileSync(
  new URL("../../../styles/66-october-compendium-screens.css", import.meta.url),
  "utf8",
);
const clanStyles = readFileSync(
  new URL("../../../styles/67-october-clan-standings.css", import.meta.url),
  "utf8",
);
const organizerStyles = readFileSync(
  new URL("../../../styles/organizer-route.css", import.meta.url),
  "utf8",
);
const profileStyles = readFileSync(
  new URL("../../../styles/18-profile-customization.css", import.meta.url),
  "utf8",
);
const rewardStyles = readFileSync(
  new URL("../../../styles/38-compendium-rewards.css", import.meta.url),
  "utf8",
);

function unavailable() {
  throw new Error("A private preview must never submit an action");
}

describe("October preview actions", () => {
  it("offers exactly four desktop screen links in the planned order", () => {
    const html = renderToStaticMarkup(<OctoberSectionNavigation />);
    expect(OCTOBER_PREVIEW_SECTIONS.map((section) => section.label)).toEqual([
      "Кланы", "Личный зачёт", "Гонка за звёздами", "Задания дня",
    ]);
    for (const section of OCTOBER_PREVIEW_SECTIONS) {
      expect(html).toContain(`href="#${section.id}"`);
      expect(html).toContain(`aria-label="${section.label}"`);
    }
    expect(html.match(/href="#october-section-/g)).toHaveLength(4);
  });

  it("shows the new five-step personal track without the old community tally", () => {
    const html = renderToStaticMarkup(
      <CompendiumRewards
        personalStars={0}
        communityStars={0}
        isPreview
        showCommunity={false}
        personalRewards={octoberRewardsForStars(0)}
      />,
    );
    expect(html).toContain("Личный зачёт");
    expect(html).not.toContain("Зачёт сообщества");
    expect(html).toContain("Бронзовый бейдж клана");
    expect(html).toContain("Золотой бейдж клана");
    expect(html).not.toContain("Платиновый бейдж клана");
    expect(html).not.toContain("Награды выберем позже");
    expect(html).not.toContain("TI 2026");
    expect(html).not.toContain("href=\"/compendium/leaderboard\"");
    expect(html).toContain("profile-event-badge-reward");
    expect(html).toContain("profile-event-badge-profile-preview");
  });

  it("uses the compact clan crest and year in the real profile badge", () => {
    const html = renderToStaticMarkup(
      <ProfileEventBadge badgeKey="october-2026-morbus-gold" />,
    );
    expect(html).toContain("morbus-emblem-v2.webp");
    expect(html).toContain(">2026</span>");
    expect(html).not.toContain("profile-event-badge-reward-label");
    expect(html).not.toContain(">Морбус</strong>");
  });

  it("keeps clan profile badges the same size as the TI 2026 badge", () => {
    expect(profileStyles).toMatch(
      /\.profile-event-badge\s*\{[^}]*width:\s*100px;[^}]*height:\s*48px;/,
    );
    expect(rewardStyles).toMatch(
      /\.profile-event-badge-clan-reward\s*\{[^}]*width:\s*116px;[^}]*height:\s*58px;[^}]*flex-direction:\s*row;/,
    );
    expect(previewStyles).not.toContain(
      ".october-compendium-screen-personal .profile-event-badge-clan {",
    );
  });

  it("shows two original clan flags without changing the quest and race cards", () => {
    const html = renderToStaticMarkup(<OctoberClanShowcase />);
    expect(OCTOBER_CLANS.map((clan) => clan.name)).toEqual(["Морбус", "Панацея"]);
    expect(html).toContain("Флаг клана Морбус");
    expect(html).toContain("Флаг клана Панацея");
    expect(html).toContain("morbus-emblem-v2.webp");
    expect(html).toContain("panacea-emblem.webp");
    expect(html).toContain("Победители разыграют 7 предметов, проигравшие – 3");
    expect(html.match(/data-prize-pool="winners"/g)).toHaveLength(7);
    expect(html.match(/data-prize-pool="runners-up"/g)).toHaveLength(3);
    expect(html).not.toContain("Зачёт сообщества");
    expect(OCTOBER_RACE_EXCLUSION_RULES.every((rule) => rule.includes("личный зачёт и счёт клана")))
      .toBe(true);
  });

  it("shows saved clan members only inside the organizer preview", () => {
    const members: OctoberClanMember[] = [
      {
        discordId: "1",
        dotaId: "101",
        playerName: "Alpha",
        avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
        clanId: "morbus",
        totalPoints: 4,
      },
      {
        discordId: "2",
        dotaId: "102",
        playerName: "Bravo",
        avatarUrl: null,
        clanId: "panacea",
        totalPoints: 2,
      },
    ];
    const html = renderToStaticMarkup(
      <OctoberClanShowcase members={members} viewerDiscordId="1" />,
    );
    expect(html).toContain("Состав клана Морбус");
    expect(html).toContain("Состав клана Панацея");
    expect(html).toContain("/players/101");
    expect(html).toContain("/players/102");
    expect(html.match(/1 участник/g)).toHaveLength(4);
    expect(html.match(/class="october-clan-standing-open"/g)).toHaveLength(2);
    expect(html).toContain("Полный зачёт клана Морбус");
    expect(html.match(/aria-label="Закрыть полный зачёт"/g)).toHaveLength(2);
    expect(html).toContain("discord-avatars");
    expect(html).toContain("october-clan-standing-row--current");
    expect(html).toContain(">Вы</span>");
    expect(html.match(/class="october-clan-identity"/g)).toHaveLength(2);
    expect(html).not.toContain("Клан 01");
    expect(html).not.toContain("Клан 02");
  });

  it("keeps only ten leaders on each clan card and the complete list in its dialog", () => {
    const members: OctoberClanMember[] = Array.from({ length: 12 }, (_, index) => ({
      discordId: String(index + 1),
      dotaId: String(100 + index),
      playerName: `Player ${index + 1}`,
      avatarUrl: null,
      clanId: "morbus",
      totalPoints: 12 - index,
    }));
    const html = renderToStaticMarkup(
      <OctoberClanShowcase members={members} viewerDiscordId="12" />,
    );
    expect(html.match(/october-clan-standing-row--compact/g)).toHaveLength(11);
    expect(html).toContain("october-clan-standing-ellipsis");
    expect(html).toContain("october-clan-standing-row--compact october-clan-standing-row--current");
    expect(html).toContain("Полный зачёт клана Морбус");
    expect(html).toContain("Player 12");
  });

  it("gives both clanmates a star and permits the same match to close a hero quest", () => {
    const html = renderToStaticMarkup(<OctoberClanOutingCard />);
    expect(html).toContain("Клановая вылазка");
    expect(html).toContain("Выиграйте одну рейтинговую игру вместе с участником своего клана");
    expect(html).toContain("каждый получит по одной звезде");
    expect(html).toContain("одновременно засчитать для испытания 1 или 2");
    expect(html).toMatch(/class="compendium-check-button"[^>]*disabled/);
  });

  it("renders the existing daily card with disabled buttons", () => {
    const html = renderToStaticMarkup(
      <QuestCard
        quest={octoberDailyQuestSamples()[0]}
        rewardStars={1}
        isChecking={false}
        isRerolling={false}
        canCheck={false}
        hasReroll={false}
        canReroll={false}
        onCheck={unavailable}
        onReroll={unavailable}
        isPreview
      />,
    );
    expect(html).toContain("compendium-quest");
    expect(html).toContain("Пока не открыто");
    expect(html).toMatch(/class="compendium-reroll-button"[^>]*disabled/);
    expect(html).toMatch(/class="compendium-check-button"[^>]*disabled/);
  });

  it("renders the existing Rune card without a hero picker or check button", () => {
    const html = renderToStaticMarkup(
      <RuneChallenge
        initialChallenge={{
          hasAccess: false,
          accessRoleName: null,
          selection: null,
          completion: null,
        }}
        currentTimeMs={0}
        rewardStars={1}
        resetCountdown=""
        onStarsChange={unavailable}
        isPreview
      />,
    );
    expect(html).toContain("compendium-rune-challenge");
    expect(html).toContain("Испытание Рун");
    expect(html).not.toContain("compendium-rune-picker");
    expect(html).not.toContain("compendium-check-button");
  });

  it("uses the roomy desktop layout without mobile-only controls", () => {
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-race \.october-race-rules-desktop \{ display: grid; \}/,
    );
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-race \.october-race-rules-mobile \{ display: none; \}/,
    );
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-daily \.compendium-hero-portrait \{ height: auto; aspect-ratio: 16 \/ 9; \}/,
    );
    expect(previewStyles).not.toContain("height: clamp(50px, 6vh, 70px)");
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-daily \.compendium-daily-section \{[\s\S]*?justify-content: center;[\s\S]*?padding-bottom: 22px;/,
    );
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-daily \.october-clan-quest-note:last-of-type \{\s*margin: 4px 0 14px;/,
    );
    expect(previewStyles).not.toMatch(
      /\.october-compendium-screen-race \.compendium-star-race-quest h3 \{\s*margin-top: auto;/,
    );
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-clans \.compendium-hero-section \{[\s\S]*?flex: 0 0 25%;/,
    );
    expect(clanStyles).toContain("grid-template-columns: repeat(10, minmax(42px, 1fr))");
    expect(clanStyles).toContain("grid-auto-rows: minmax(25px, 1fr)");
    expect(clanStyles).toContain("width: min(100%, 150px)");
    expect(clanStyles).toContain("transform: translateY(-5%)");
    expect(clanStyles).toContain("max-height: min(82dvh, 820px)");
    expect(organizerStyles.indexOf("67-october-clan-standings.css"))
      .toBeGreaterThan(organizerStyles.indexOf("66-october-compendium-screens.css"));
  });
});
