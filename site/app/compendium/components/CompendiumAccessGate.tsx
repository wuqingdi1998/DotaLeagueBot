import { FaDiscord } from "react-icons/fa";
import { FiCheckCircle, FiLogIn } from "react-icons/fi";
import { CompendiumRewards } from "./CompendiumRewards";

const discordInviteUrl = "https://discord.gg/lsesports";

export function CompendiumAccessGate() {
  return (
    <div className="compendium-access-gate">
      <div className="compendium-access-preview" aria-hidden="true">
        <div className="compendium-page">
          <section className="compendium-hero-section">
            <div className="compendium-orb compendium-orb-one" />
            <div className="compendium-orb compendium-orb-two" />
            <div className="compendium-title-block">
              <p className="compendium-kicker">The International 2026</p>
              <h1>Компендиум</h1>
            </div>
          </section>
          <section className="compendium-rewards-section">
            <CompendiumRewards personalStars={0} communityStars={0} />
          </section>
          <section className="compendium-daily-section">
            <div className="compendium-section-heading">
              <div>
                <span>
                  Обновление ежедневно в{" "}
                  <time dateTime="00:00" data-moscow-recurring-time>
                    00:00 МСК
                  </time>
                </span>
                <h2>Задания дня</h2>
              </div>
            </div>
            <div className="compendium-access-preview-quests">
              <span />
              <span />
              <span />
            </div>
          </section>
        </div>
      </div>

      <div className="compendium-access-overlay">
        <section
          className="compendium-access-card"
          aria-labelledby="compendium-access-title"
        >
          <div className="compendium-access-icon">
            <FaDiscord aria-hidden="true" />
          </div>
          <p className="compendium-access-kicker">Доступ участника</p>
          <h1 id="compendium-access-title">Откройте Компендиум</h1>
          <p className="compendium-access-intro">
            Для доступа к заданиям, наградам и прогнозам выполните два шага.
          </p>
          <ol>
            <li>
              <FiCheckCircle aria-hidden="true" />
              <span>
                Зарегистрироваться на сервере{" "}
                <a href={discordInviteUrl} target="_blank" rel="noreferrer">
                  Linken&apos;s Sphere Esports
                </a>{" "}
                в канале <strong>#регистрация</strong>.
              </span>
            </li>
            <li>
              <FiCheckCircle aria-hidden="true" />
              <span>Авторизоваться на сайте через Discord.</span>
            </li>
          </ol>
          <a
            className="compendium-access-login"
            href="/api/auth/discord?returnTo=%2Fcompendium"
          >
            <FiLogIn aria-hidden="true" />
            Авторизоваться через Discord
          </a>
        </section>
      </div>
    </div>
  );
}
