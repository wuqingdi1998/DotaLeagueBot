import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { loadFearlessDraftSnapshot } from "../server/snapshot-service";
import { SeasonLobbyBot3Screen } from "./SeasonLobbyBot3Screen";

export const dynamic = "force-dynamic";

export default async function Bot3Page() {
  const user = await getSession();
  if (!user) redirect("/api/auth/discord?returnTo=%2Ffearless-draft%2Fbot3");
  const snapshot = await loadFearlessDraftSnapshot(user);
  if (!snapshot.series?.isSeasonLobbyPreview) redirect("/fearless-draft");
  return (
    <PlatformShell user={user}>
      <SeasonLobbyBot3Screen initialDraft={snapshot} />
    </PlatformShell>
  );
}

