import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { OctoberLaunchCenter } from "../admin/OctoberLaunchCenter";
import { loadOctoberLaunchReport } from "../services/clan-launch-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Центр запуска Компендиума",
  robots: { index: false, follow: false },
};

export default async function OctoberLaunchPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const report = await loadOctoberLaunchReport();
  return <PlatformShell user={user}><OctoberLaunchCenter initialReport={report} /></PlatformShell>;
}
