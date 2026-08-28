import type { DraftLobbyPlayer, DraftPlayer } from "./snapshot";

export type LobbyPreviewProfile = Omit<
  DraftLobbyPlayer,
  "teamSide" | "isOnline"
>;

export function buildLobbyPreviewRoster({
  viewer,
  profiles,
  botCaptainId,
}: {
  viewer: LobbyPreviewProfile;
  profiles: LobbyPreviewProfile[];
  botCaptainId: string;
}): DraftLobbyPlayer[] {
  if (profiles.length !== 9) {
    throw new Error("Для предпросмотра нужны девять профилей");
  }

  const teamA = [viewer, ...profiles.slice(0, 4)].map((profile) => ({
    ...profile,
    teamSide: "a" as const,
    isOnline: true,
  }));
  const teamB = profiles.slice(4).map((profile, index) => ({
    ...profile,
    id: index === 0 ? botCaptainId : profile.id,
    teamSide: "b" as const,
    isOnline: true,
  }));

  return [...teamA, ...teamB];
}

export function buildLobbyPreviewBotCaptain(
  roster: DraftLobbyPlayer[],
  botCaptainId: string,
): DraftPlayer | null {
  const captain = roster.find((player) => player.id === botCaptainId);
  return captain
    ? {
        id: captain.id,
        name: captain.name,
        discordName: captain.name,
        avatarUrl: captain.avatarUrl,
      }
    : null;
}
