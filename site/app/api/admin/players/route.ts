import {
  archiveParticipant,
  linkArchiveIdentity,
  mergeArchiveIdentities,
  renameArchiveIdentity,
  unlinkArchiveProfile,
  updateParticipantTier,
} from "@/lib/player-identity-admin";
import {
  confirmOrganizerPassword,
  requireAdmin,
  responseFromAuthError,
} from "@/lib/auth";

type PlayerAdminRequest = {
  action?: string;
  playerId?: string;
  identityId?: string;
  sourceIdentityId?: string;
  targetPlayerId?: string;
  nickname?: string;
  password?: string;
  tier?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlayerAdminRequest;
    const admin =
      body.action === "archive"
        ? await confirmOrganizerPassword(body.password ?? "")
        : await requireAdmin();

    switch (body.action) {
      case "update-tier":
        return Response.json(
          await updateParticipantTier(
            body.playerId ?? "",
            Number(body.tier),
            admin.discordId,
          ),
        );
      case "archive":
        return Response.json(
          await archiveParticipant(body.playerId ?? "", admin.discordId),
        );
      case "rename-archive":
        return Response.json(
          await renameArchiveIdentity(
            body.identityId ?? "",
            body.nickname ?? "",
            admin.discordId,
          ),
        );
      case "merge-archive":
        return Response.json(
          await mergeArchiveIdentities(
            body.identityId ?? "",
            body.sourceIdentityId ?? "",
            admin.discordId,
          ),
        );
      case "link-archive":
        return Response.json(
          await linkArchiveIdentity(
            body.identityId ?? "",
            body.targetPlayerId ?? "",
            admin.discordId,
          ),
        );
      case "unlink-archive":
        return Response.json(
          await unlinkArchiveProfile(body.playerId ?? "", admin.discordId),
        );
      default:
        return Response.json({ error: "Неизвестное действие" }, { status: 400 });
    }
  } catch (error) {
    return responseFromAuthError(error);
  }
}
