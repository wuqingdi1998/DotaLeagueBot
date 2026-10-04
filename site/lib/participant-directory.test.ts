import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hallPage = readFileSync(
  new URL("../app/hall-of-fame/page.tsx", import.meta.url),
  "utf8",
);
const hallLoader = readFileSync(
  new URL("./hall-of-fame.ts", import.meta.url),
  "utf8",
);
const participantsPage = readFileSync(
  new URL("../app/participants/page.tsx", import.meta.url),
  "utf8",
);
const participantsTable = readFileSync(
  new URL("../app/participants/ParticipantsTable.tsx", import.meta.url),
  "utf8",
);
const participantsLoader = readFileSync(
  new URL("./participants.ts", import.meta.url),
  "utf8",
);
const header = readFileSync(
  new URL("../app/components/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const directoryStyles = readFileSync(
  new URL("../app/styles/28-participants.css", import.meta.url),
  "utf8",
);
const runeNicknameStyles = readFileSync(
  new URL("../app/styles/03-subscription-rune-nicknames.css", import.meta.url),
  "utf8",
);
const runeNickname = readFileSync(
  new URL("../app/components/SubscriptionRuneNickname.tsx", import.meta.url),
  "utf8",
);
const participantTierStyles = readFileSync(
  new URL("../app/styles/32-participant-tier-status.css", import.meta.url),
  "utf8",
);
const baseHallStyles = readFileSync(
  new URL("../app/styles/19-hall-of-fame.css", import.meta.url),
  "utf8",
);
const seasonalHallStyles = readFileSync(
  new URL("../app/styles/19-hall-of-fame-seasonal.css", import.meta.url),
  "utf8",
);
const hallStyles = [baseHallStyles, seasonalHallStyles].join("\n");
const hallTable = readFileSync(
  new URL("../app/hall-of-fame/HallOfFameTable.tsx", import.meta.url),
  "utf8",
);

describe("hall of fame and participant directory", () => {
  it("limits the hall of fame to medalists from seasonal tournaments", () => {
    expect(hallLoader).toContain("JOIN player_medals medal");
    expect(hallLoader).toContain(
      "medal_tournament.tournament_type IN ('seasonal', 'seasonal_cup')",
    );
    expect(hallPage).toContain(
      "Медальный зачёт участников за всю историю. В зачёт идут только",
    );
    expect(hallPage).toContain("сезонные турниры — лига и кубок лиги.");
  });

  it("shows completed medal tournaments from earliest to latest", () => {
    expect(hallLoader).toContain("medal_tournament.end_at < NOW()");
    expect(hallLoader).toMatch(
      /ORDER BY\s+medal_tournament\.start_at ASC,\s+medal_tournament\.end_at ASC/,
    );
    expect(hallLoader).toContain("tournamentMedals");
    expect(hallPage).toContain("tournaments={hallOfFame.tournaments}");
    expect(hallTable).toContain("tournaments.map((tournament) =>");
    expect(hallTable.indexOf("hall-season-tournament")).toBeLessThan(
      hallTable.indexOf("hall-medal-heading gold"),
    );
  });

  it("keeps names and medal totals fixed around a horizontal tournament strip", () => {
    expect(hallTable).toContain('className="hall-player-panel"');
    expect(hallTable).toContain('className="hall-season-panel"');
    expect(hallTable).toContain('className="hall-totals-panel"');
    expect(hallTable).toContain('className="hall-season-header-scroll"');
    expect(hallTable).toContain('className="hall-season-body-scroll"');
    expect(hallTable).toContain("syncSeasonScroll");
    expect(hallTable).toContain('className="hall-table hall-medal-table"');
    expect(seasonalHallStyles).toMatch(
      /\.hall-medal-table\s*\{[^}]*display:\s*grid;/,
    );
    expect(seasonalHallStyles).not.toMatch(/(^|\n)\.hall-table\s*\{/);
    expect(hallStyles).toMatch(
      /\.hall-season-header-scroll\s*\{[^}]*overflow-x:\s*scroll;/,
    );
    expect(hallStyles).toMatch(
      /\.hall-season-body-scroll\s*\{[^}]*overflow-x:\s*auto;/,
    );
    expect(hallStyles).toContain(".hall-season-tournament");
    expect(hallStyles).toContain(".hall-season-medal");
    expect(hallStyles).toMatch(
      /\.hall-season-row\s*\{[^}]*width:\s*max-content;/,
    );
    expect(hallStyles).toMatch(
      /\.hall-player-row\.hall-panel-head\s*\{[^}]*padding-bottom:\s*10px;/,
    );
    expect(hallStyles).toMatch(
      /\.hall-totals-row\.hall-panel-head\s*\{[^}]*padding-bottom:\s*10px;/,
    );
    expect(hallStyles).not.toContain("position: sticky");
  });

  it("adds the participant directory after the hall of fame in both menus", () => {
    const desktopHall = header.indexOf('href="/hall-of-fame"');
    const desktopParticipants = header.indexOf('href="/participants"');
    const desktopDiscord = header.indexOf("href={discordUrl}");
    expect(desktopHall).toBeLessThan(desktopParticipants);
    expect(desktopParticipants).toBeLessThan(desktopDiscord);
    expect(header.match(/href="\/participants"/g)).toHaveLength(2);
    expect(header).toContain("participantsActive");
  });

  it("shows current tiers and the three external player services", () => {
    expect(participantsPage).toContain("players={players}");
    expect(participantsLoader).toContain("NULLIF(player.internal_rating, 0)");
    expect(participantsLoader).toContain("player.rank_tier / 10");
    expect(participantsLoader).not.toContain("latest_tier.tier");
    expect(participantsLoader).not.toContain("known_tier");
    expect(participantsLoader).toContain("buildPlayerLinks(dotaId)");
    expect(participantsTable).toContain('player.tier ?? "—"');
    expect(participantsTable).not.toContain("`Тир ${player.tier}`");
    expect(participantsTable).toContain('["dotabuff", "stratz", "steam"]');
    expect(participantsTable).toContain("participant-links");
  });

  it("loads compact static Discord avatars in the participant list", () => {
    expect(participantsTable).toContain(
      "compactDiscordAvatarUrl(player.avatarUrl)",
    );
    expect(participantsTable).not.toContain("src={player.avatarUrl}");
  });

  it("colors participant nicknames by their subscription rune", () => {
    expect(participantsLoader).toContain("player_discord_roles");
    expect(participantsLoader).toContain(
      "subscription.role_name AS subscription_role",
    );
    expect(participantsTable).toContain("SubscriptionRuneNickname");
    expect(runeNickname).toContain('nicknameClass: "water"');
    expect(runeNickname).toContain('nicknameClass: "damage"');
    expect(runeNickname).toContain('nicknameClass: "illusion"');
    expect(runeNicknameStyles).toContain("color: #26bfd6");
    expect(runeNicknameStyles).toContain("--rune-nickname-start: #2f32cf");
    expect(runeNicknameStyles).toContain("--rune-nickname-end: #38c2fd");
    expect(runeNicknameStyles).toContain("--rune-nickname-start: #fafadc");
    expect(runeNicknameStyles).toContain("--rune-nickname-end: #ffde08");
    expect(runeNicknameStyles).toContain("--rune-nickname-start: #cc37d1");
    expect(runeNicknameStyles).toContain("--rune-nickname-end: #ffb1d8");
    expect(runeNicknameStyles).toContain("--rune-nickname-start: #5913d1");
    expect(runeNicknameStyles).toContain("--rune-nickname-end: #ad2ae9");
    expect(runeNicknameStyles).toContain("--rune-nickname-start: #fc5454");
    expect(runeNicknameStyles).toContain("--rune-nickname-end: #c50303");
    expect(runeNicknameStyles).toContain("--rune-nickname-start: #9fffa5");
    expect(runeNicknameStyles).toContain("--rune-nickname-end: #207910");
    expect(runeNicknameStyles).toContain(
      "animation: subscription-rune-nickname-shimmer 4s ease-in-out infinite alternate",
    );
  });

  it("shows the matching rune after the nickname and before the clan badge", () => {
    const runeAssets = [
      "water.png",
      "damage.png",
      "illusion.png",
      "arcane.png",
      "invisibility.png",
      "haste.png",
      "regeneration.png",
    ];
    for (const asset of runeAssets) {
      expect(
        existsSync(
          new URL(`../public/participant-runes/${asset}`, import.meta.url),
        ),
      ).toBe(true);
      expect(runeNickname).toContain(`/participant-runes/${asset}`);
    }
    expect(runeNickname).toContain('className="subscription-rune-icon"');
    expect(runeNicknameStyles).toMatch(
      /\.subscription-rune-icon\s*\{[^}]*width:\s*1\.5em;[^}]*height:\s*1\.5em;/,
    );
    expect(participantsTable.indexOf("<SubscriptionRuneNickname")).toBeLessThan(
      participantsTable.indexOf("<OctoberClanBadge"),
    );
  });

  it("lets the organizer show only manually assigned tiers", () => {
    expect(participantsLoader).toContain(
      "player.internal_rating <> 0 AS has_manual_tier",
    );
    expect(participantsTable).toContain("Показать ручные тиры");
    expect(participantsTable).toContain("showManualTiers");
  });

  it("keeps only the custom right-hand search clear button", () => {
    expect(directoryStyles).toMatch(
      /\.participant-search input::-webkit-search-cancel-button\s*\{[^}]*display:\s*none;/,
    );
    expect(participantsTable).toContain('aria-label="Очистить поиск"');
  });

  it("keeps every participant column inside a compact phone viewport", () => {
    expect(directoryStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.participants-table\s*\{[^}]*overflow-x:\s*hidden;/,
    );
    expect(directoryStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.participants-row\s*\{[^}]*min-width:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 34px 36px 92px;/,
    );
    expect(participantTierStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.participants-table\.organizer \.participants-row\s*\{[^}]*min-width:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 34px 48px 92px;/,
    );
  });

  it("does not let archive identities break the participant page", () => {
    expect(participantsLoader).toContain(
      "player.steam_id32 BETWEEN 1 AND 4294967295",
    );
    expect(participantsLoader).toContain(
      "normalizeDotaAccountId(row.dota_id)",
    );
    expect(participantsLoader).toContain("if (!dotaId) return []");
  });

  it("searches every remembered nickname of a registered participant", () => {
    expect(participantsLoader).toContain("JOIN player_nickname_history history");
    expect(participantsLoader).toContain(
      "ON history.player_id = member.player_id",
    );
    expect(participantsLoader).toContain("SELECT history.nickname");
  });

  it("matches tier badges to profile buttons and keeps medals compact", () => {
    expect(directoryStyles).toMatch(
      /\.participant-tier\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;[^}]*border:\s*1px solid var\(--line-strong\);[^}]*border-radius:\s*50%;[^}]*background:\s*var\(--surface-soft\);[^}]*color:\s*var\(--text\);/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-medal-table\s*\{[^}]*--hall-gold-column:\s*28px;[^}]*--hall-silver-column:\s*28px;[^}]*--hall-bronze-column:\s*28px;/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-medal svg\s*\{[^}]*display:\s*none;/,
    );
    expect(directoryStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.participant-tier\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;[^}]*font-size:\s*14px;/,
    );
  });

  it("keeps medal totals wider on desktop and compact on smaller screens", () => {
    expect(hallStyles).toMatch(
      /\.hall-medal-table\s*\{[^}]*--hall-gold-column:\s*88px;[^}]*--hall-silver-column:\s*88px;[^}]*--hall-bronze-column:\s*96px;/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.hall-medal-table\s*\{[^}]*--hall-gold-column:\s*44px;[^}]*--hall-silver-column:\s*44px;[^}]*--hall-bronze-column:\s*44px;/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-medal-table\s*\{[^}]*--hall-gold-column:\s*28px;[^}]*--hall-silver-column:\s*28px;[^}]*--hall-bronze-column:\s*28px;/,
    );
  });

  it("centers participant column headings over roles, tiers and profiles", () => {
    expect(directoryStyles).toMatch(
      /\.participants-row\.hall-head > span:nth-child\(n \+ 3\)\s*\{[^}]*justify-self:\s*center;[^}]*text-align:\s*center;/,
    );
    expect(directoryStyles).toMatch(
      /\.participant-roles\s*\{[^}]*justify-self:\s*center;[^}]*text-align:\s*center;/,
    );
    expect(directoryStyles).toMatch(
      /\.participant-links\s*\{[^}]*justify-self:\s*center;[^}]*justify-content:\s*center;/,
    );
  });
});
