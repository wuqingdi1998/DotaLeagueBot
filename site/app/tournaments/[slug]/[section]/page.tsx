import { notFound } from "next/navigation";
import { TournamentPageView } from "../TournamentPageView";
import { tournamentSectionTabs } from "../model/tournament-route";

export default async function TournamentSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!tournamentSectionTabs.includes(
    section as (typeof tournamentSectionTabs)[number],
  )) {
    notFound();
  }
  return <TournamentPageView />;
}
