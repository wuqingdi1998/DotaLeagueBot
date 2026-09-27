import Image from "next/image";
import { OCTOBER_CLANS } from "../model/clans";
import type { OctoberClanMember } from "../model/clan-members";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import { OctoberClanStandings } from "../components/OctoberClanStandings";

export function OctoberClanShowcase({
  members = [],
  viewerDiscordId,
}: {
  members?: readonly OctoberClanMember[];
  viewerDiscordId?: string;
}) {
  return (
    <section className="october-clan-showcase" aria-labelledby="october-clan-title">
      <div className="october-clan-showcase-heading">
        <span>Два клана · один победитель</span>
        <h2 id="october-clan-title">Морбус против Панацеи</h2>
        <p>Каждая заработанная звезда пополнит личный и клановый зачёт.</p>
      </div>

      <OctoberClanPrizeBoard />

      <div className="october-clan-lineup">
        {OCTOBER_CLANS.map((clan, index) => {
          const clanMembers = members.filter((member) => member.clanId === clan.id);
          return (
            <div className="october-clan-lineup-slot" key={clan.id}>
              {index > 0 && <span className="october-clan-versus" aria-hidden="true">VS</span>}
              <article className={`october-clan-card october-clan-card--${clan.id}`}>
                <div className="october-clan-identity">
                  <div className="october-clan-flag" aria-label={`Флаг клана ${clan.name}`}>
                    <span className="october-clan-flag-inner">
                      <Image
                        src={clan.emblem}
                        alt=""
                        width={164}
                        height={164}
                        sizes="(max-width: 720px) 110px, 164px"
                      />
                    </span>
                  </div>
                  <h3>{clan.name}</h3>
                </div>
                <div className="october-clan-card-copy">
                  <OctoberClanStandings
                    clanId={clan.id}
                    clanName={clan.name}
                    members={clanMembers}
                    viewerDiscordId={viewerDiscordId}
                  />
                </div>
              </article>
            </div>
          );
        })}
      </div>

    </section>
  );
}
