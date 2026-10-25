import Image from "next/image";
import { FiGift } from "react-icons/fi";
import { OCTOBER_CLAN_PRIZE_RESULTS } from "../model/clan-prize-results";
import { octoberPrizeImagePath } from "../model/october-prize-images";

export function CompendiumClanPrizeResults() {
  return (
    <section className="compendium-results-section compendium-clan-prize-results" aria-labelledby="clan-prize-results-title">
      <header className="compendium-results-section-heading">
        <h2 id="clan-prize-results-title"><FiGift aria-hidden="true" /> Результаты розыгрыша</h2>
      </header>
      <div className="compendium-clan-prize-results-grid">
        {OCTOBER_CLAN_PRIZE_RESULTS.map((draw) => (
          <article className={`compendium-clan-prize-result is-${draw.pool}`} key={draw.pool}>
            <header className="compendium-clan-prize-result-heading">
              <Image src={draw.clan.emblem} alt="" width={48} height={48} />
              <div>
                <span>{draw.label}</span>
                <h3>{draw.clan.name}</h3>
              </div>
              <strong>Призов: {draw.prizes.length}</strong>
            </header>
            <div className="compendium-clan-prize-tables">
            {Array.from({ length: draw.pool === "winners" ? 2 : 1 }, (_, index) => {
              const columnSize = Math.ceil(draw.prizes.length / (draw.pool === "winners" ? 2 : 1));
              const prizes = draw.prizes.slice(index * columnSize, (index + 1) * columnSize);
              return <table key={index} className="compendium-clan-prize-table" aria-label={`Призы клана ${draw.clan.name}${index ? ", продолжение" : ""}`}>
              <thead>
                <tr><th scope="col">№</th><th scope="col">Приз</th><th scope="col">Получатель</th></tr>
              </thead>
              <tbody>
                {prizes.map((prize) => (
                  <tr key={prize.id}>
                    <td>{prize.poolPosition}</td>
                    <td>
                      <div className="compendium-clan-prize-item">
                        <Image
                          src={octoberPrizeImagePath(prize.thumbnailImagePath ?? prize.imagePath, "thumbnail")}
                          alt=""
                          width={24}
                          height={24}
                        />
                        <span title={prize.name}>{prize.name.replace("Steam Gift Card на", "Steam")}</span>
                      </div>
                    </td>
                    <td><strong>{prize.recipientName}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>;
            })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
