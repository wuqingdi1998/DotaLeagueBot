import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const avatarComponent = source("../app/components/AvatarImage.tsx");
const nextConfig = source("../next.config.ts");
const avatarConsumers = [
  "../app/components/SiteHeader.tsx",
  "../app/hall-of-fame/HallOfFameTable.tsx",
  "../app/participants/ParticipantsTable.tsx",
  "../app/players/[dotaId]/page.tsx",
  "../app/compendium/admin/CompendiumBase.tsx",
  "../app/compendium/sections/CompendiumLeaderboard.tsx",
  "../app/compendium/sections/CompendiumResults.tsx",
  "../app/fearless-draft/components/PlayerAvatar.tsx",
  "../app/season-lobby/[matchId]/components/LobbyChat.tsx",
  "../app/season-lobby/[matchId]/components/LobbyPlayerTeams.tsx",
  "../app/tournaments/[slug]/admin/SeasonTeamSelection.tsx",
  "../app/tournaments/[slug]/components/TournamentModals.tsx",
  "../app/tournaments/[slug]/sections/SeasonLobbyDisplay.tsx",
  "../app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
  "../app/tournaments/[slug]/sections/SeasonStandingsPanel.tsx",
].map(source);

describe("player avatar failure handling", () => {
  it("replaces an unavailable image with the supplied fallback", () => {
    expect(avatarComponent).toContain("useState");
    expect(avatarComponent).toContain("failedSource === source");
    expect(avatarComponent).toContain("onError={() => setFailedSource(source)}");
    expect(avatarComponent).toContain("return <>{fallback}</>");
  });

  it("uses the shared failure handling everywhere player avatars are shown", () => {
    for (const consumer of avatarConsumers) {
      expect(consumer).toContain("AvatarImage");
    }
  });

  it("allows both Discord image hosts used by stored avatar links", () => {
    expect(nextConfig).toContain("https://cdn.discordapp.com");
    expect(nextConfig).toContain("https://media.discordapp.net");
    expect(nextConfig).toContain('hostname: "media.discordapp.net"');
  });
});
