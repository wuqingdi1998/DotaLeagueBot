import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hallPage = readFileSync(
  new URL("../app/hall-of-fame/page.tsx", import.meta.url),
  "utf8",
);
const hallLoader = readFileSync(
  new URL("./player-profile.ts", import.meta.url),
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
  new URL("../app/styles/19-hall-of-fame.css", import.meta.url),
  "utf8",
);

describe("hall of fame and participant directory", () => {
  it("limits the hall of fame to medalists from seasonal tournaments", () => {
    expect(hallLoader).toContain("JOIN player_medals medal");
    expect(hallLoader).toContain("medal_tournament.tournament_type = 'seasonal'");
    expect(hallPage).toContain(
      "Медальный зачёт участников за всю историю. В зачёт идут только",
    );
    expect(hallPage).toContain("сезонные турниры — лига и кубок лиги.");
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
    expect(participantsPage).toContain("<ParticipantsTable players={players}");
    expect(participantsLoader).toContain("NULLIF(player.internal_rating, 0)");
    expect(participantsLoader).toContain("player.rank_tier / 10");
    expect(participantsLoader).toContain("latest_tier.tier");
    expect(participantsLoader).toContain("buildPlayerLinks(dotaId)");
    expect(participantsTable).toContain(': player.tier}');
    expect(participantsTable).not.toContain("`Тир ${player.tier}`");
    expect(participantsTable).toContain("player.links.dotabuff");
    expect(participantsTable).toContain("player.links.stratz");
    expect(participantsTable).toContain("player.links.steam");
    expect(participantsTable).toContain("participant-links");
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
    expect(directoryStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-row\s*\{[^}]*repeat\(3,\s*30px\)/,
    );
    expect(directoryStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hall-medal svg\s*\{[^}]*display:\s*none;/,
    );
    expect(directoryStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.participant-tier\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*font-size:\s*14px;/,
    );
  });
});
