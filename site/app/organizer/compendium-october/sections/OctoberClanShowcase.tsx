import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { OCTOBER_CLANS } from "../model/clans";
import type { OctoberClanMember } from "../model/clan-members";

function participantCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} участников`;
  if (lastDigit === 1) return `${count} участник`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} участника`;
  return `${count} участников`;
}

export function OctoberClanShowcase({
  members = [],
}: {
  members?: readonly OctoberClanMember[];
}) {
  return (
    <section className="october-clan-showcase" aria-labelledby="october-clan-title">
      <div className="october-clan-showcase-heading">
        <span>Два клана · один победитель</span>
        <h2 id="october-clan-title">Морбус против Панацеи</h2>
        <p>Каждая заработанная звезда пополнит личный и клановый зачёт.</p>
      </div>

      <div className="october-clan-lineup">
        {OCTOBER_CLANS.map((clan, index) => {
          const clanMembers = members.filter((member) => member.clanId === clan.id);
          return (
            <div className="october-clan-lineup-slot" key={clan.id}>
              {index > 0 && <span className="october-clan-versus" aria-hidden="true">VS</span>}
              <article className={`october-clan-card october-clan-card--${clan.id}`}>
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
                <div className="october-clan-card-copy">
                  <span className="october-clan-card-kicker">Клан 0{index + 1}</span>
                  <h3>{clan.name}</h3>
                  {members.length ? (
                    <div className="october-clan-roster">
                      <strong>{participantCountLabel(clanMembers.length)}</strong>
                      <ul aria-label={`Состав клана ${clan.name}`}>
                        {clanMembers.map((member) => (
                          <li key={member.discordId}>
                            <Link href={`/players/${member.dotaId}`}>
                              <span aria-hidden="true">{member.playerName.slice(0, 1).toLocaleUpperCase("ru")}</span>
                              {member.playerName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>Состав появится после распределения участников 3 октября.</p>
                  )}
                  <span className="october-clan-score"><FaStar aria-hidden="true" /> Зачёт откроется 5 октября</span>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <p className="october-clan-showcase-footer">
        Победивший клан разыграет три предмета, второй клан – один. Ещё по два предмета ждут игроков в каждой недельной гонке.
      </p>
    </section>
  );
}
