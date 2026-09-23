import Link from "next/link";
import { FiArrowLeft, FiGift, FiLock, FiStar } from "react-icons/fi";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/plan";

export function OctoberCompendiumBase() {
  return (
    <main className="october-compendium-page october-compendium-base">
      <div className="october-compendium-wrap">
        <Link className="october-compendium-back" href="/organizer/compendium-october">
          <FiArrowLeft aria-hidden="true" /> Вернуться в компендиум
        </Link>

        <section className="october-compendium-base-hero">
          <span className="october-compendium-eyebrow"><FiLock aria-hidden="true" /> Только для организатора</span>
          <h1>База нового компендиума</h1>
          <p>
            Полный план всех трёх недель: даты, условия каждого задания, звёзды
            и два призовых места в каждой гонке. Будущие недели хранятся здесь
            до их публикации для участников.
          </p>
          <div className="october-compendium-base-summary">
            <span>5–25 октября 2026</span>
            <span>3 гонки</span>
            <span>21 задание</span>
          </div>
        </section>

        <div className="october-compendium-base-weeks">
          {OCTOBER_COMPENDIUM_WEEKS.map((week, index) => (
            <section key={week.id} className="october-compendium-base-week">
              <header>
                <span>Неделя {index + 1} / 3</span>
                <h2>{week.title}</h2>
                <p>{week.dateLabel} · с 00:00 понедельника до 00:00 следующего понедельника по Москве</p>
              </header>
              <div className="october-compendium-base-prizes">
                {week.prizes.map((prize) => (
                  <div key={prize.place}>
                    <FiGift aria-hidden="true" />
                    <strong>{prize.place}-е место</strong>
                    <span>Один игровой предмет · выбор позже</span>
                  </div>
                ))}
              </div>
              <div className="october-compendium-base-quests">
                {week.quests.map((quest) => (
                  <article key={quest.dateKey}>
                    <div className="october-compendium-base-quest-date">
                      <span>{quest.weekday}</span>
                      <strong>{quest.dateLabel}</strong>
                    </div>
                    <div>
                      <h3>{quest.title}</h3>
                      <p>{quest.description}</p>
                    </div>
                    <b aria-label={`${quest.rewardStars} звёзд`}>
                      <FiStar aria-hidden="true" /> {quest.rewardStars}
                    </b>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
