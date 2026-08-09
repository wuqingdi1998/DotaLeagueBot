import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { loadFearlessDraftSnapshot } from "./server/snapshot-service";
import { FearlessDraftScreen } from "./FearlessDraftScreen";

export const dynamic = "force-dynamic";

export default async function FearlessDraftPage() {
  const user = await getSession();
  if (!user) {
    redirect("/api/auth/discord?returnTo=%2Ffearless-draft");
  }
  const snapshot = await loadFearlessDraftSnapshot(user);
  return (
    <PlatformShell user={user}>
      <FearlessDraftScreen initialSnapshot={snapshot} />
    </PlatformShell>
  );
}
