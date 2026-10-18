import { OctoberClanShowcaseView } from "./OctoberClanShowcaseView";
import type { OctoberClanMember } from "../model/clan-members";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import { OctoberClanReservationPanel } from "../components/OctoberClanReservationPanel";
import type { OctoberClanReservationState } from "../model/clan-reservation";
import type { SeasonTournamentLinks } from "@/app/season/model/season-overview-model";

export function OctoberClanShowcase({
  members = [],
  viewerDiscordId,
  reservation,
  isOrganizerPreview = false,
  isOrganizer = false,
  tournamentLinks = {},
}: {
  members?: readonly OctoberClanMember[];
  viewerDiscordId?: string;
  reservation?: OctoberClanReservationState;
  isOrganizerPreview?: boolean;
  isOrganizer?: boolean;
  tournamentLinks?: SeasonTournamentLinks;
}) {
  return <OctoberClanShowcaseView members={members} viewerDiscordId={viewerDiscordId}
    prizeBoard={<OctoberClanPrizeBoard
        members={members}
        isOrganizer={isOrganizer}
        tournamentLinks={tournamentLinks}
      />}
    reservationPanel={reservation && reservation.phase !== "published" && reservation.phase !== "finished" && (
        <OctoberClanReservationPanel
          key={reservation.phase}
          initialState={reservation}
          isOrganizerPreview={isOrganizerPreview}
        />
      )}
  />;
}
