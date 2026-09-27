import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { octoberRaceForMoment } from "./model/plan";
import { loadOctoberClanMembers } from "./services/clan-members";
import { OctoberPreviewProfileActions } from "./components/OctoberPreviewProfileActions";
import {
  OCTOBER_PREVIEW_MAXIMUM_STARS,
  OCTOBER_PREVIEW_STARS_PARAM,
  octoberPreviewStars,
} from "./model/preview-settings";
import { OctoberCompendiumPreview } from "./sections/OctoberCompendiumPreview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новый компендиум · Предпросмотр",
  robots: { index: false, follow: false },
};
export default async function OctoberCompendiumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  const query = await searchParams;
  const personalStars = octoberPreviewStars(query[OCTOBER_PREVIEW_STARS_PARAM]);
  const clanMembers = await loadOctoberClanMembers();

  return (
    <PlatformShell
      user={user}
      hasFooter={false}
      profileMenuExtras={(
        <OctoberPreviewProfileActions
          isMaximumStarsEnabled={personalStars === OCTOBER_PREVIEW_MAXIMUM_STARS}
        />
      )}
    >
      <OctoberCompendiumPreview
        week={octoberRaceForMoment(new Date())}
        clanMembers={clanMembers}
        viewerDiscordId={user.discordId}
        personalStars={personalStars}
      />
    </PlatformShell>
  );
}
