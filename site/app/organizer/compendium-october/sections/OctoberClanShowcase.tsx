import { OCTOBER_CLANS } from "../model/clans";
import type { OctoberClanMember } from "../model/clan-members";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import { OctoberClanStandings } from "../components/OctoberClanStandings";
import { OctoberClanReservationPanel } from "../components/OctoberClanReservationPanel";
import type { OctoberClanReservationState } from "../model/clan-reservation";

export function OctoberClanShowcase({
  members = [],
  viewerDiscordId,
  reservation,
  isOrganizerPreview = false,
}: {
  members?: readonly OctoberClanMember[];
  viewerDiscordId?: string;
  reservation?: OctoberClanReservationState;
  isOrganizerPreview?: boolean;
}) {
  return (
    <section className="october-clan-showcase" aria-label="Клановый зачёт">
      <OctoberClanPrizeBoard />
      {reservation && reservation.phase !== "published" && (
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
