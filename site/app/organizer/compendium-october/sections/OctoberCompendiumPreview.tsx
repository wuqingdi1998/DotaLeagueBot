import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCalendar, FiGift, FiLock, FiStar } from "react-icons/fi";
import { OCTOBER_COMPENDIUM_DATE_LABEL, type OctoberCompendiumWeekDefinition } from "../model/plan";

const familiarActivities = [
  {
    number: "01",
    title: "Задания дня",
    text: "Три личных задания с наборами героев. Победа в рейтинговом матче на одном из указанных героев приносит звезду. В пятницу, субботу и воскресенье награда удваивается. За звёзды открываются дополнительные попытки замены заданий и четвёртое испытание.",
  },
  {
    number: "02",
    title: "Испытание Рун",
    text: "Участник с подходящей ролью выбирает героя дня и получает звёзды за победу на нём. Эти звёзды идут в личный и общий зачёт, но не влияют на место в недельной гонке.",
  },
  {
    number: "03",
    title: "Общие звёзды",
    text: "Звёзды всех участников складываются. Конкретные награды за личные и общие пороги добавим после выбора призов.",
  },
] as const;

export function OctoberCompendiumPreview({
  week,
}: {
  week: OctoberCompendiumWeekDefinition;
}) {
  return (
    <main className="october-compendium-page">
      <div className="october-compendium-wrap">
        <Link className="october-compendium-back" href="/organizer">
          <FiArrowLeft aria-hidden="true" /> Архив организатора
        </Link>

        <section className="october-compendium-hero">
          <div className="october-compendium-hero-copy">
            <span className="october-compendium-eyebrow">Закрытый просмотр · будущий апдейт</span>
            <h1>Новый<br /><em>компендиум</em></h1>
            <p>
              Три недели заданий и три отдельные гонки за звёздами. Здесь можно
              посмотреть оформление и правила до открытия участникам.
            </p>
            <div className="october-compendium-hero-actions">
              <Link href="/organizer/compendium-october/base">
                Открыть базу всех недель <FiArrowRight aria-hidden="true" />
              </Link>
              <span><FiLock aria-hidden="true" /> Только для организатора</span>
            </div>
          </div>
          <div className="october-compendium-hero-art" aria-hidden="true">
            <div className="october-compendium-orbit orbit-one" />
            <div className="october-compendium-orbit orbit-two" />
            <div className="october-compendium-emblem"><FiStar /></div>
            <span>III</span>
          </div>
        </section>

        <div className="october-compendium-facts" aria-label="План события">
          <div><FiCalendar aria-hidden="true" /><span>Период</span><strong>{OCTOBER_COMPENDIUM_DATE_LABEL}</strong></div>
          <div><FiStar aria-hidden="true" /><span>Недельных гонок</span><strong>3</strong></div>
          <div><FiGift aria-hidden="true" /><span>Призовых мест</span><strong>2 в каждой гонке</strong></div>
        </div>

        <section className="october-compendium-section" aria-labelledby="october-daily-title">
          <div className="october-compendium-section-heading">
            <span>Знакомая механика</span>
            <h2 id="october-daily-title">Каждый день есть за что играть</h2>
            <p>Личные задания, испытание Руны и общие звёзды сохраняются.</p>
          </div>
          <div className="october-compendium-mechanics">
            {familiarActivities.map((activity) => (
              <article key={activity.number}>
                <span>{activity.number}</span>
                <h3>{activity.title}</h3>
                <p>{activity.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="october-compendium-section" aria-labelledby="october-race-title">
          <div className="october-compendium-section-heading with-action">
            <div>
              <span>Отдельный зачёт каждой недели</span>
              <h2 id="october-race-title">{week.title}</h2>
              <p>{week.dateLabel} · семь заданий, по одному на каждый день</p>
            </div>
            <Link href="/organizer/compendium-october/base">
              Все три недели в Базе <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="october-compendium-race-rules">
            <p>
              В гонке учитываются звёзды, заработанные за эту неделю.
              Звёзды за Испытание Рун и бонусное четвёртое ежедневное задание
              в гонку не входят. При равенстве звёзд выше тот, кто выполнил
              больше заданий гонки; дальнейшее равенство решает жеребьёвка.
            </p>
            <div className="october-compendium-prizes">
              {week.prizes.map((prize) => (
                <div key={prize.place}>
                  <FiGift aria-hidden="true" />
                  <span>{prize.place}-е место</span>
                  <strong>{prize.title}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="october-compendium-week-quests">
            {week.quests.map((quest) => (
              <article key={quest.dateKey}>
                <div><span>{quest.weekday}</span><strong>{quest.dateLabel}</strong></div>
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>
                <b><FiStar aria-hidden="true" /> {quest.rewardStars}</b>
              </article>
            ))}
          </div>
        </section>

        <div className="october-compendium-footer-note">
          <FiLock aria-hidden="true" />
          <p>Это закрытая версия. Задания пока нельзя выполнять, звёзды не начисляются, а призы ещё не выбраны.</p>
        </div>
      </div>
    </main>
  );
}
