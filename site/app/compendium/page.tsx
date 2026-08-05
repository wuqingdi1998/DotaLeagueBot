import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { CompendiumAccessGate } from "./components/CompendiumAccessGate";
import { CompendiumDashboard } from "./sections/CompendiumDashboard";
import { loadCompendium } from "./services/compendium";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Компендиум The International — Linken's Sphere Esports",
  description: "Ежедневные задания Dota 2 и звёзды компендиума.",
};

export default async function CompendiumPage() {
  const user = await getSession();
  if (!user) {
    return (
      <PlatformShell user={null}>
        <CompendiumAccessGate />
      </PlatformShell>
    );
  }
  const data = await loadCompendium(user);
  return (
    <PlatformShell user={user}>
      <CompendiumDashboard
        key={data.moscowDate}
        initialData={data}
        isOrganizer={user.isAdmin}
      />
    </PlatformShell>
  );
}
