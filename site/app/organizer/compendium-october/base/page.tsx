import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { OctoberCompendiumBase } from "../sections/OctoberCompendiumBase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "База нового компендиума · Только для организатора",
  robots: { index: false, follow: false },
};

export default async function OctoberCompendiumBasePage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();

  return (
    <PlatformShell user={user}>
      <OctoberCompendiumBase />
    </PlatformShell>
  );
}
