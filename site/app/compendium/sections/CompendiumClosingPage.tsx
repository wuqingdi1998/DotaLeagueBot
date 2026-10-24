import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { loadCompendiumResults } from "../services/results-repository";
import { CompendiumClosingRefresh } from "../components/CompendiumClosingRefresh";
import { CompendiumResults } from "./CompendiumResults";

export async function CompendiumClosingPage({ user, now }: { user: AuthUser; now: Date }) {
  const data = await loadCompendiumResults(user.discordId, "october", now);
  if (data.isFinished) redirect("/compendium/results");
  return <PlatformShell user={user}>
    <CompendiumClosingRefresh isWaiting />
    <CompendiumResults data={data} currentPlayerId={user.discordId} />
  </PlatformShell>;
}
