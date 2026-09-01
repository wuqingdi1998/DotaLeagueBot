import type { Metadata } from "next";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { SeasonOverviewPage } from "./sections/SeasonOverviewPage";

export const metadata: Metadata = {
  title: "Сезон — Linken's Sphere Esports",
  description:
    "Формат сезона Linken's Sphere Esports: лига, Кубок лиги, Fast Cup и путь в финал.",
};

export default async function SeasonPage() {
  const user = await getSession();

  return (
    <PlatformShell user={user} hasFooter={false}>
      <SeasonOverviewPage />
    </PlatformShell>
  );
}
