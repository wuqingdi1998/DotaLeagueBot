import { FiInfo } from "react-icons/fi";

export function CompendiumExclusionNotice() {
  return (
    <div className="compendium-access-overlay compendium-exclusion-notice">
      <section className="compendium-access-card" aria-labelledby="compendium-exclusion-title">
        <div className="compendium-access-icon">
          <FiInfo aria-hidden="true" />
        </div>
        <p className="compendium-access-kicker">Доступ к событию</p>
        <h1 id="compendium-exclusion-title">Компендиум недоступен</h1>
        <p className="compendium-access-intro">
          Участники с ролью «Массовка» не участвуют в Компендиуме. Задания,
          клановый выбор, звёзды и розыгрыш призов для этой роли не показываются.
        </p>
      </section>
    </div>
  );
}
