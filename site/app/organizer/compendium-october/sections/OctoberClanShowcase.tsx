import { OCTOBER_CLANS } from "../model/clans";
import type { OctoberClanMember } from "../model/clan-members";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import { OctoberClanStandings } from "../components/OctoberClanStandings";
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
  return (
    <section className="october-clan-showcase" aria-label="Клановый зачёт">
      <OctoberClanPrizeBoard
        isOrganizer={isOrganizer}
        tournamentLinks={tournamentLinks}
      />
      {reservation && reservation.phase !== "published" && reservation.phase !== "finished" && (
        <OctoberClanReservationPanel
          key={reservation.phase}
          initialState={reservation}
          isOrganizerPreview={isOrganizerPreview}
        />
      )}

      <div className="october-clan-lineup">
        {OCTOBER_CLANS.map((clan, index) => {
          const clanMembers = members.filter((member) => member.clanId === clan.id);
          return (
            <div className="october-clan-lineup-slot" key={clan.id}>
              {index > 0 && <span className="october-clan-versus" aria-hidden="true">VS</span>}
              <OctoberClanStandings
                clanId={clan.id}
                clanName={clan.name}
                clanEmblem={clan.emblem}
                members={clanMembers}
                viewerDiscordId={viewerDiscordId}
              />
            </div>
          );
        })}
      </div>

    </section>
  );
}
