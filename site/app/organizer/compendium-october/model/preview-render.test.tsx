import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
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
import { OCTOBER_CLAN_PRIZES } from "./clan-prizes";
import type { OctoberClanMember } from "./clan-members";
const previewStyles = readFileSync(new URL("../../../styles/66-october-compendium-screens.css", import.meta.url), "utf8");
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
const routeStyles = readFileSync(
  new URL("../../../styles/compendium-route.css", import.meta.url),
  "utf8",
);
const starRaceSource = readFileSync(
  new URL("../../../compendium/components/CompendiumStarRace.tsx", import.meta.url),
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
const prizeBoardSource = readFileSync(
  new URL("../components/OctoberClanPrizeBoard.tsx", import.meta.url),
  "utf8",
);
const clanStandingsSource = readFileSync(
  new URL("../components/OctoberClanStandings.tsx", import.meta.url),
  "utf8",
);
function unavailable() { throw new Error("A private preview must never submit an action"); }
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
    expect(html).toContain("profile-event-badge-clan");
    expect(html).not.toContain("profile-event-badge-clan-reward");
  });

  it("uses the compact clan crest and year in the real profile badge", () => {
    const html = renderToStaticMarkup(
      <ProfileEventBadge badgeKey="october-2026-morbus-gold" />,
    );
    expect(html).toContain("morbus-emblem.png");
    expect(html).toContain(">2026</span>");
    expect(html).not.toContain("profile-event-badge-reward-label");
    expect(html).not.toContain(">Морбус</strong>");
  });

  it("gives reward previews enough room while keeping the real profile badge compact", () => {
    expect(profileStyles).toMatch(
      /\.profile-event-badge\s*\{[^}]*width:\s*100px;[^}]*height:\s*48px;[^}]*box-sizing:\s*border-box;/,
    );
    expect(rewardStyles).toMatch(
      /\.profile-event-badge-reward\s*\{[^}]*width:\s*100px;[^}]*height:\s*48px;[^}]*flex:\s*0 0 100px;/,
    );
    expect(profileStyles).toMatch(
      /\.profile-event-badge-clan\s*\{[^}]*grid-template-columns:\s*36px minmax\(0, 1fr\);[^}]*padding:\s*5px 0 5px 5px;/,
    );
    expect(profileStyles).toMatch(
      /\.profile-event-badge-year\s*\{[^}]*width:\s*100%;[^}]*text-align:\s*center;/,
    );
    expect(rewardStyles).not.toContain("profile-event-badge-clan-reward");
    expect(rewardStyles).not.toContain("profile-event-badge-profile-preview");
    expect(previewStyles).not.toContain(
      ".october-compendium-screen-personal .profile-event-badge-clan {",
    );
  });

  it("shows two original clan flags without changing the quest and race cards", () => {
    const html = renderToStaticMarkup(<OctoberClanShowcase />);
    expect(OCTOBER_CLANS.map((clan) => clan.name)).toEqual(["Морбус", "Панацея"]);
    expect(html).toContain("Флаг клана Морбус");
    expect(html).toContain("Флаг клана Панацея");
    expect(html).toContain("morbus-emblem.png");
    expect(html).toContain("panacea-emblem.png");
    expect(html).toContain("30 предметов в финальном розыгрыше");
    expect(html).toContain("Каждая звезда – дополнительный шанс на выигрыш");
    expect(html).toContain("Победители разыграют 21 предмет, проигравшие – 9");
    expect(html).not.toContain("Морбус против Панацеи");
    expect(html).not.toContain("Каждая заработанная звезда пополнит личный и клановый зачёт");
    expect(html).toContain('<p id="october-clan-prizes-title">30 предметов');
    expect(html).toContain("<p>Победители разыграют 21 предмет, проигравшие – 9</p>");
    expect(html.match(/data-prize-pool="winners"/g)).toHaveLength(21);
    expect(html.match(/data-prize-pool="runners-up"/g)).toHaveLength(9);
    expect(
      OCTOBER_CLAN_PRIZES
        .filter((prize) => prize.imagePath)
        .map(({ pool, poolPosition, name, approximateValue }) =>
          `${pool}:${poolPosition}:${name}:${approximateValue}`,
        ),
    ).toEqual([
      "winners:1:Shattered Greatsword:6 000 ₽",
      "winners:2:Auspicious Scythe of Vyse:1 400 ₽",
      "winners:3:Undying Love:700 ₽",
      "winners:4:Magus Mimicry:600 ₽",
      "winners:5:Snailfire:600 ₽",
      "winners:6:Steam Gift Card на 500 ₽:500 ₽",
      "winners:7:Steam Gift Card на 500 ₽:500 ₽",
      "runners-up:1:Doll of the Dead:700 ₽",
      "runners-up:2:Steam Gift Card на 500 ₽:500 ₽",
      "runners-up:3:Mantle of the Cinder Baron:300 ₽",
      "winners:8:Frostmoot:500 ₽",
      "winners:9:Almond the Frondillo:300 ₽",
      "winners:10:The Igneous Stone:300 ₽",
      "winners:11:Altar Ball:200 ₽",
      "winners:12:Aberrant Observer:200 ₽",
      "winners:13:The Lightning Orchid:200 ₽",
      "winners:14:Golden Fortune's Tout:200 ₽",
      "runners-up:4:Golden Bloodfeather Feast:200 ₽",
      "runners-up:5:Steam Gift Card на 100 ₽:100 ₽",
      "runners-up:6:Steam Gift Card на 100 ₽:100 ₽",
      "winners:15:Steam Gift Card на 100 ₽:100 ₽",
      "winners:16:Steam Gift Card на 100 ₽:100 ₽",
      "winners:17:Steam Gift Card на 100 ₽:100 ₽",
      "winners:18:Steam Gift Card на 100 ₽:100 ₽",
      "winners:19:Steam Gift Card на 100 ₽:100 ₽",
      "winners:20:Steam Gift Card на 100 ₽:100 ₽",
      "winners:21:Steam Gift Card на 100 ₽:100 ₽",
      "runners-up:7:Steam Gift Card на 100 ₽:100 ₽",
      "runners-up:8:Steam Gift Card на 100 ₽:100 ₽",
      "runners-up:9:Golden Deepshock Destroyer:100 ₽",
    ]);
    expect(
      existsSync(
        new URL(
          "../../../../public/compendium/october/steam-gift-card-500-rub.png",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        new URL(
          "../../../../public/compendium/october/shattered-greatsword.png",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(html.match(/<img[^>]+steam-gift-card-500-rub-thumbnail-[a-f0-9]+\.webp[^>]*>/g)).toHaveLength(3);
    expect(html.match(/<img[^>]+steam-gift-card-100-rub-thumbnail-[a-f0-9]+\.webp[^>]*>/g)).toHaveLength(11);
    expect(html.match(/<img[^>]+frostmoot-thumbnail-[a-f0-9]+\.webp[^>]*>/g)).toHaveLength(1);
    expect(html.match(/<img[^>]+shattered-greatsword-thumbnail-[a-f0-9]+\.webp[^>]*>/g)).toHaveLength(1);
    expect(html.match(/Steam Gift Card на 500 ₽/g)).toHaveLength(3);
    expect(html).toContain("Shattered Greatsword");
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
    expect(html).not.toContain(">Бронь</span>");
    expect(html.match(/class="october-clan-identity"/g)).toHaveLength(2);
    expect(html).toContain("4 очка у клана Морбус");
    expect(html).not.toContain("october-clan-name-badge");
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
    expect(clanStandingsSource).toMatch(/closest<HTMLElement>\("\.october-compendium-preview"\)[\s\S]*?document\.body\.style\.overflow = "hidden"[\s\S]*?compendiumScrollContainer\.style\.overflowY = "hidden"/);
    expect(clanStyles).toContain("overflow-y: auto; overscroll-behavior-y: contain");
  });

  it("gives both clanmates the weekend bonus and permits the same match to close a hero quest", () => {
    const html = renderToStaticMarkup(<OctoberClanOutingCard />);
    expect(html).toContain("Клановая вылазка");
    expect(html).toContain("Выиграйте один рейтинговый или обычный All Pick матч вместе с участником своего клана");
    expect(html).toContain("каждый получит по две звезды");
    expect(html).toContain("Награда: 1 звезда каждому");
    expect(html).toContain("одновременно засчитать для испытания 1 или 2");
    expect(html).toMatch(/class="compendium-check-button"[^>]*disabled/);
  });

  it("lets each participant hide and restore the two daily explanations", () => {
    const html = renderToStaticMarkup(<OctoberDailyPreview viewerDiscordId="viewer-1" rewardStars={2} />);
    expect(html).toContain("aria-label=\"Вернуть пояснения к заданиям\"");
    expect(html).toContain("aria-label=\"Скрыть пояснение к заданиям дня\"");
    expect(html).toContain("aria-label=\"Скрыть пояснение к клановой вылазке\"");
    expect(html).toContain("Для всех трёх заданий и Испытания Рун");
    expect(html.match(/aria-label="Награда: 2 звезды"/g)).toHaveLength(3); expect(html).toContain("compendium-weekend-bonus");
    expect(html).not.toContain("Два испытания с героями · одна клановая вылазка");
    expect(guideStyles).toContain(".october-daily-section--compact-guidance .compendium-quest-grid");
  });

  it("keeps the platinum reward beside the first five milestones", () => {
    const html = renderToStaticMarkup(
      <CompendiumRewards
        personalStars={120}
        communityStars={0}
        isPreview
        showCommunity={false}
        personalRewards={octoberRewardsForStars(120)}
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

  it("keeps desktop daily controls compact while allowing long conditions to grow", () => {
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-race \.october-race-rules-desktop \{ display: grid; \}/,
    );
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-race \.october-race-rules-mobile \{ display: none; \}/,
    );
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-daily \.compendium-hero-portrait \{\s*height: clamp\(56px, 8dvh, 80px\);/,
    );
    expect(previewStyles).not.toContain("height: clamp(50px, 6vh, 70px)");
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-daily \.compendium-daily-section \{[\s\S]*?flex: 1;[\s\S]*?justify-content: center;[\s\S]*?padding-bottom: 22px;/,
    );
    expect(previewStyles).toMatch(/\.october-compendium-screen-daily \{\s*height: auto;\s*min-height: calc\(100dvh - 76px\);\s*overflow: visible;/);
    expect(guideStyles).toContain(".october-daily-section--expanded-guidance .compendium-quest-grid > .compendium-quest");
    expect(guideStyles).toMatch(/\.october-compendium-example-note\.october-dismissible-guide \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/);
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
      "grid-template-columns: minmax(0, 1fr) minmax(570px, 0.9fr)",
    );
    expect(clanStyles).toMatch(
      /\.october-clan-prize-slot\s*\{[^}]*min-height:\s*60px;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-prize-slot-image\s*\{[^}]*padding:\s*2px;/,
    );
    expect(clanStyles).toMatch(
      /@media \(max-width:\s*660px\)[\s\S]*?\.october-clan-prize-slot\s*\{[^}]*min-height:\s*62px;/,
    );
    expect(clanStyles).toContain(".october-clan-prize-popover--below");
    expect(clanStyles).toContain(".october-clan-prize-slot-image");
    expect(clanStyles).toContain("white-space: nowrap");
    expect(prizeBoardSource).toContain("bounds.bottom + 9");
    expect(prizeBoardSource).toContain("Ценность ~ ${prize.approximateValue}");
    expect(clanStyles).toMatch(
      /\.october-clan-prize-copy p\s*\{[^}]*color:\s*#f2d67d;[^}]*font-size:\s*clamp\(12px, 1vw, 14px\);/,
    );
    expect(presentationStyles).toMatch(
      /\.october-clan-showcase\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*2;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-total-stars\s*\{[^}]*font-size:\s*15px;[^}]*font-weight:\s*800;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-prize-popover\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*1000;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-open\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.25;/,
    );
    expect(clanStyles).toContain(
      "grid-template-columns: minmax(136px, 24%) minmax(0, 1fr)",
    );
    expect(presentationStyles).not.toContain(".october-clan-showcase-heading");
    expect(previewStyles).not.toContain(".october-clan-showcase-heading");
    expect(clanStyles).not.toContain(".october-clan-showcase-heading");
    expect(clanStyles).toMatch(
      /\.october-clan-standings-compact\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standings > \.october-clan-standing-empty\s*\{[^}]*place-self:\s*center;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-row--compact\s*\{[^}]*padding:\s*2px 12px 2px 6px;[^}]*font-size:\s*13px;/,
    ); expect(clanStyles).toMatch(/\.october-clan-standings-compact \.october-clan-standing-row--compact\s*\{[^}]*flex:\s*0 0 auto;/);
    expect(clanStyles).toMatch(
      /\.october-compendium-screen-clans \.october-clan-standings-compact \.october-clan-standing-row--compact\s*\{[^}]*flex:\s*1 1 0;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-row--compact \.october-clan-standing-avatar\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-row--compact \.october-clan-standing-name,[\s\S]*?\.october-clan-standing-row--compact > strong\s*\{[^}]*font-size:\s*15px;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-row--compact > strong svg\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/,
    );
    expect(clanStyles).toMatch(
      /\.october-clan-standing-ellipsis\s*\{[^}]*flex:\s*0 0 8px;[^}]*line-height:\s*8px;/,
    );
    expect(clanStyles).toContain("width: min(100%, 150px)");
    expect(clanStyles).toContain("transform: translateY(-5%)");
    expect(clanStyles).toContain("width: min(100%, 112px)");
    expect(clanStyles).toContain("max-height: min(82dvh, 820px)");
    expect(previewStyles).toContain("min-height: clamp(300px, 38vh, 350px)");
    expect(previewStyles).toContain(".october-compendium-screen-race .compendium-star-race::before { display: none; }");
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-race \.compendium-star-race \{[\s\S]*?flex: 0 0 auto;[\s\S]*?justify-content: flex-start;/,
    );
    expect(starRaceSource).toContain("отдельный недельный межклановый зачёт");
    expect(previewStyles).toMatch(
      /\.october-compendium-screen-race \.compendium-star-race-quest h3 \{\s*margin: 10px 0;/,
    );
    expect(guideStyles).toMatch(
      /\.october-daily-section--compact-guidance \.compendium-quest-grid \{[^}]*flex: 0 0 auto;/,
    );
    expect(routeStyles.indexOf("67-october-clan-standings.css"))
      .toBeGreaterThan(routeStyles.indexOf("66-october-compendium-screens.css"));
    expect(routeStyles.indexOf("68-october-compendium-guides.css"))
      .toBeGreaterThan(routeStyles.indexOf("67-october-clan-standings.css"));
  });
  it("uses one continuous clan saga background across all four October screens", () => {
    const backgroundName = "clan-table-ultra-4x.webp";
    expect(presentationStyles.match(new RegExp(backgroundName, "g"))).toHaveLength(1);
    expect(presentationStyles).toContain(".october-compendium-preview::before");
    expect(presentationStyles).toContain("background-size: 100% 100%, cover");
    expect(presentationStyles).not.toContain("background-size: 100% 400%");
    expect(existsSync(new URL(`../../../../public/compendium/october/${backgroundName}`, import.meta.url)))
      .toBe(true);
    expect(existsSync(new URL("../../../../public/compendium/october/clan-hall-hd.webp", import.meta.url)))
      .toBe(true);
    expect(previewSource).not.toContain("compendium-orb compendium-orb-one");
    expect(previewSource).not.toContain("compendium-orb compendium-orb-two");
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
