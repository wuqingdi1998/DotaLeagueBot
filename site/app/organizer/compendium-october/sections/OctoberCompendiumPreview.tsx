import { OctoberCompendiumView } from "./OctoberCompendiumView";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { type OctoberCompendiumWeekDefinition } from "../model/plan";
import { octoberRewardsForStars } from "../model/rewards";
import { OctoberDailyPreview, OctoberRacePreview } from "./OctoberActivityPreview";
import { OctoberClanShowcase } from "./OctoberClanShowcase";
import { OctoberSectionNavigation } from "../components/OctoberSectionNavigation";
import type { OctoberClanMember } from "../model/clan-members";
import type { OctoberClanReservationState } from "../model/clan-reservation";
import type { SeasonTournamentLinks } from "@/app/season/model/season-overview-model";
import type { OctoberDailyQuestData } from "../services/october-daily-quests";
import type { StarRaceData } from "@/app/compendium/model/star-race";

export function OctoberCompendiumPreview({
  week,
  clanMembers,
  viewerDiscordId,
  personalStars,
  reservation,
  areDailyQuestsOpen = true,
  dailyRewardStars = 1,
  dailyQuestData,
  starRaceData,
  serverNow,
  isOrganizerPreview = false,
  isOrganizer = false,
  tournamentLinks = {},
}: {
  week: OctoberCompendiumWeekDefinition;
  clanMembers: readonly OctoberClanMember[];
  viewerDiscordId: string;
  personalStars: number;
  reservation?: OctoberClanReservationState;
  areDailyQuestsOpen?: boolean;
  dailyRewardStars?: 1 | 2;
  dailyQuestData?: OctoberDailyQuestData;
  starRaceData?: StarRaceData;
  serverNow?: string;
  isOrganizerPreview?: boolean;
  isOrganizer?: boolean;
  tournamentLinks?: SeasonTournamentLinks;
}) {
  return <OctoberCompendiumView
    navigation={<OctoberSectionNavigation />}
    clans={<OctoberClanShowcase members={clanMembers} viewerDiscordId={viewerDiscordId}
      reservation={reservation} isOrganizerPreview={isOrganizerPreview} isOrganizer={isOrganizer} tournamentLinks={tournamentLinks} />}
    rewards={<CompendiumRewards personalStars={personalStars} communityStars={0} isPreview showCommunity={false} personalRewards={octoberRewardsForStars(personalStars)} />}
    race={<OctoberRacePreview week={week} initialRace={starRaceData} serverNow={serverNow} />}
    daily={<OctoberDailyPreview viewerDiscordId={viewerDiscordId} isOpen={areDailyQuestsOpen} rewardStars={dailyRewardStars} initialData={dailyQuestData} serverNow={serverNow} />}
  />;
}
