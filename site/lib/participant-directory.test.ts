import { readFileSync } from "node:fs";
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
const hallStyles = [
  readFileSync(
    new URL("../app/styles/19-hall-of-fame.css", import.meta.url),
    "utf8",
  ),
  readFileSync(
    new URL("../app/styles/19-hall-of-fame-seasonal.css", import.meta.url),
    "utf8",
  ),
].join("\n");
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
    expect(hallStyles).toMatch(
      /\.hall-table\s*\{[^}]*overflow-x:\s*auto;/,
    );
    expect(hallStyles).toContain(".hall-season-tournament");
    expect(hallStyles).toContain(".hall-season-medal");
    expect(hallStyles).toMatch(
      /\.hall-row > :first-child,\s*\.hall-row > :nth-child\(2\),\s*\.hall-row > :nth-last-child\(-n \+ 3\)\s*\{[^}]*position:\s*sticky;/,
    );
  });

  it("adds the participant directory after the hall of fame in both menus", () => {
    const desktopHall = header.indexOf('href="/hall-of-fame"');
    const desktopParticipants = header.indexOf('href="/participants"');
    const desktopDiscord = header.indexOf("<a href={discordUrl}");
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

  it("does not let archive identities break the participant page", () => {
    expect(participantsLoader).toContain(
      "player.steam_id32 BETWEEN 1 AND 4294967295",
    );
    expect(participantsLoader).toContain(
      "normalizeDotaAccountId(row.dota_id)",
    );
    expect(participantsLoader).toContain("if (!dotaId) return []");
  });

  it("matches tier badges to profile buttons and keeps medals compact", () => {
    expect(directoryStyles).toMatch(
      /\.participant-tier\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;[^}]*border:\s*1px solid var\(--line-strong\);[^}]*border-radius:\s*50%;[^}]*background:\s*var\(--surface-soft\);[^}]*color:\s*var\(--text\);/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-table\s*\{[^}]*--hall-gold-column:\s*30px;[^}]*--hall-silver-column:\s*30px;[^}]*--hall-bronze-column:\s*30px;/,
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
      /\.hall-table\s*\{[^}]*--hall-gold-column:\s*108px;[^}]*--hall-silver-column:\s*108px;[^}]*--hall-bronze-column:\s*120px;/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.hall-table\s*\{[^}]*--hall-gold-column:\s*44px;[^}]*--hall-silver-column:\s*44px;[^}]*--hall-bronze-column:\s*44px;/,
    );
    expect(hallStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-table\s*\{[^}]*--hall-gold-column:\s*30px;[^}]*--hall-silver-column:\s*30px;[^}]*--hall-bronze-column:\s*30px;/,
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
