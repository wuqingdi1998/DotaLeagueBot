import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { ProfileEventBadge } from "@/app/components/ProfileEventBadge";
import { OctoberClanShowcase } from "../sections/OctoberClanShowcase";
import { OctoberClanOutingCard } from "../sections/OctoberClanOutingCard";
import { OctoberDailyPreview } from "../sections/OctoberActivityPreview";
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
const presentationStyles = readFileSync(
  new URL("../../../styles/65-october-compendium.css", import.meta.url),
  "utf8",
);
const clanStyles = readFileSync(
  new URL("../../../styles/67-october-clan-standings.css", import.meta.url),
  "utf8",
);
const guideStyles = readFileSync(
  new URL("../../../styles/68-october-compendium-guides.css", import.meta.url),
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
const profileBadgeTierStyles = readFileSync(
  new URL("../../../styles/18-profile-badge-tiers.css", import.meta.url),
  "utf8",
);
const rewardStyles = readFileSync(
  new URL("../../../styles/38-compendium-rewards.css", import.meta.url),
  "utf8",
);
const previewSource = readFileSync(
  new URL("../sections/OctoberCompendiumPreview.tsx", import.meta.url),
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
      /\.profile-event-badge-clan-reward\s*\{[^}]*width:\s*122px;[^}]*height:\s*58px;[^}]*flex-direction:\s*row;/,
    );
    expect(profileStyles).toMatch(
      /\.profile-event-badge-clan\s*\{[^}]*grid-template-columns:\s*36px minmax\(0, 1fr\);[^}]*padding:\s*5px 0 5px 5px;/,
    );
    expect(profileStyles).toMatch(
      /\.profile-event-badge-year\s*\{[^}]*width:\s*100%;[^}]*text-align:\s*center;/,
    );
    expect(rewardStyles).toMatch(
      /\.profile-event-badge-profile-preview\s*\{[^}]*inset:\s*0;[^}]*place-items:\s*center;/,
    );
    expect(rewardStyles).toMatch(
      /\.profile-event-badge-reward:hover \.profile-event-badge-clan-reward,[\s\S]*?opacity:\s*0;/,
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
    expect(html).toContain("10 предметов в финальном розыгрыше, каждая звезда – дополнительный шанс на выигрыш");
    expect(html).toContain("Победители разыграют 7 предметов, проигравшие – 3");
    expect(html).not.toContain("Морбус против Панацеи");
    expect(html).not.toContain("Каждая заработанная звезда пополнит личный и клановый зачёт");
    expect(html).toContain('<p id="october-clan-prizes-title">10 предметов');
    expect(html).toContain("<p>Победители разыграют 7 предметов, проигравшие – 3</p>");
    expect(html.match(/data-prize-pool="winners"/g)).toHaveLength(7);
    expect(html.match(/data-prize-pool="runners-up"/g)).toHaveLength(3);
    expect(html).not.toContain("Зачёт сообщества");
    expect(OCTOBER_RACE_EXCLUSION_RULES.every((rule) => rule.includes("личный зачёт и счёт клана")))
      .toBe(true);
  });

  it("shows the season instead of the date in the main title", () => {
    expect(previewSource).toContain("<h1>Компендиум</h1>");
    expect(previewSource).toContain("Сезон 9. Часть 1.");
    expect(previewSource).not.toContain("Два клана. Один победитель.");
    expect(previewSource).not.toContain(
      '<p className="compendium-kicker">{OCTOBER_COMPENDIUM_DATE_LABEL}</p>',
    );
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
    expect(html.match(/1 участник/g)).toHaveLength(2);
    expect(html.match(/class="october-clan-standing-open"/g)).toHaveLength(2);
    expect(html).toContain("Полный зачёт клана Морбус");
    expect(html.match(/aria-label="Закрыть полный зачёт"/g)).toHaveLength(2);
    expect(html).toContain("discord-avatars");
    expect(html).toContain("october-clan-standing-row--current");
    expect(html).toContain(">Вы</span>");
    expect(html.match(/class="october-clan-identity"/g)).toHaveLength(2);
    expect(html).toContain("4 очка у клана Морбус");
    expect(html.indexOf("Полный зачёт клана")).toBeLessThan(html.indexOf("october-clan-card-copy"));
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

  it("lets each participant hide and restore the two daily explanations", () => {
    const html = renderToStaticMarkup(<OctoberDailyPreview viewerDiscordId="viewer-1" />);
    expect(html).toContain("aria-label=\"Вернуть пояснения к заданиям\"");
    expect(html).toContain("aria-label=\"Скрыть пояснение к заданиям дня\"");
    expect(html).toContain("aria-label=\"Скрыть пояснение к клановой вылазке\"");
    expect(html).not.toContain("Два испытания с героями · одна клановая вылазка");
    expect(guideStyles).toContain(".october-daily-section--compact-guidance .compendium-quest-grid");
  });

  it("keeps the platinum reward beside the first five milestones", () => {
    const html = renderToStaticMarkup(
      <CompendiumRewards
        personalStars={100}
        communityStars={0}
        isPreview
        showCommunity={false}
        personalRewards={octoberRewardsForStars(100)}
      />,
    );
    expect(html).toContain("Платиновый бейдж клана");
    expect(html).toContain("--reward-milestone-count:6");
    expect(rewardStyles).toContain("repeat(var(--reward-milestone-count, 5), minmax(0, 1fr))");
    expect(profileBadgeTierStyles).toContain("--badge-main: #3f6680");
    expect(profileBadgeTierStyles).toContain("--badge-glint: #8ce6e1");
    expect(profileBadgeTierStyles).toContain(".profile-event-badge-platinum::after");
    expect(profileBadgeTierStyles).toContain("bottom right / 18px 2px no-repeat");
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
      /\.october-compendium-screen-clans \.compendium-hero-section \{[\s\S]*?flex: 0 0 calc\(100% \/ 6\);/,
    );
    expect(clanStyles).toContain("grid-template-columns: repeat(10, minmax(42px, 1fr))");
    expect(clanStyles).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(500px, 0.72fr)",
    );
    expect(clanStyles).toMatch(
      /\.october-clan-prize-copy p\s*\{[^}]*color:\s*#f2d67d;[^}]*font-size:\s*clamp\(12px, 1vw, 14px\);/,
    );
    expect(presentationStyles).not.toContain(".october-clan-showcase-heading");
    expect(previewStyles).not.toContain(".october-clan-showcase-heading");
    expect(clanStyles).not.toContain(".october-clan-showcase-heading");
    expect(clanStyles).toMatch(
      /\.october-clan-standings-compact\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-row--compact\s*\{[^}]*padding:\s*2px 12px 2px 6px;[^}]*font-size:\s*13px;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-row--compact \.october-clan-standing-avatar\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-ellipsis\s*\{[^}]*flex:\s*0 0 8px;[^}]*line-height:\s*8px;/,
    );
    expect(clanStyles).toContain("width: min(100%, 150px)");
    expect(clanStyles).toContain("transform: translateY(-5%)");
    expect(clanStyles).toContain("max-height: min(82dvh, 820px)");
    expect(organizerStyles.indexOf("67-october-clan-standings.css"))
      .toBeGreaterThan(organizerStyles.indexOf("66-october-compendium-screens.css"));
    expect(organizerStyles.indexOf("68-october-compendium-guides.css"))
      .toBeGreaterThan(organizerStyles.indexOf("67-october-clan-standings.css"));
  });

  it("places every October screen over the high-resolution clan hall", () => {
    expect(presentationStyles).toMatch(
      /\.october-compendium-screen\s*\{[\s\S]*?clan-hall-hd\.webp[\s\S]*?cover no-repeat,/,
    );
    expect(presentationStyles).toContain(
      ".october-compendium-screen-personal .compendium-reward-track",
    );
    expect(presentationStyles).toContain(
      ".october-compendium-screen-race .compendium-star-race",
    );
    expect(presentationStyles).toContain(
      ".october-compendium-screen-daily .compendium-section-heading",
    );
    expect(presentationStyles).toContain(
      ".october-compendium-screen-daily .october-compendium-example-note",
    );
  });
});
