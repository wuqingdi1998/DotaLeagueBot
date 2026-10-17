"use client";

import { OCTOBER_CLAN_PRIZES } from "../model/clan-prizes";
import { OctoberClanPrizeBoardView } from "./OctoberClanPrizeBoardView";
import { OctoberClanLead } from "./OctoberClanLead";
import { OctoberStarEarningGuide } from "./OctoberStarEarningGuide";
import { SeasonTournamentLinkEditor } from "@/app/season/admin/SeasonTournamentLinkEditor";
import type { OctoberClanMember } from "../model/clan-members";
import type { SeasonTournamentLinks } from "@/app/season/model/season-overview-model";

export function OctoberClanPrizeBoard({ members = [], isOrganizer = false, tournamentLinks = {} }: {
  members?: readonly OctoberClanMember[]; isOrganizer?: boolean; tournamentLinks?: SeasonTournamentLinks;
}) {
  return <OctoberClanPrizeBoardView prizes={OCTOBER_CLAN_PRIZES}
    lead={<OctoberClanLead members={members} />}
    guide={<OctoberStarEarningGuide isOrganizer={isOrganizer} tournamentLinks={tournamentLinks}
      renderTournamentEditor={(tournament) => <SeasonTournamentLinkEditor key={tournament.linkId} linkId={tournament.linkId} tournamentTitle={tournament.label} />} />}
  />;
}
