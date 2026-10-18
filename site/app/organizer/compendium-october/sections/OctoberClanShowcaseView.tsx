import type { ReactNode } from "react";
import type { OctoberClanMember } from "../model/clan-members";
import { OctoberClanStandings } from "../components/OctoberClanStandings";
import { OCTOBER_CLANS } from "../model/clans";

export function OctoberClanShowcaseView({ members, viewerDiscordId, prizeBoard, reservationPanel, clans = OCTOBER_CLANS }: {
  members: readonly OctoberClanMember[]; viewerDiscordId?: string;
  prizeBoard: ReactNode; reservationPanel?: ReactNode; clans?: readonly { id: typeof OCTOBER_CLANS[number]["id"]; name: string; emblem: string }[];
}) {
  return (
    <section className="october-clan-showcase" aria-label="Клановый зачёт">
      {prizeBoard}
      {reservationPanel}

      <div className="october-clan-lineup">
        {clans.map((clan, index) => {
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
