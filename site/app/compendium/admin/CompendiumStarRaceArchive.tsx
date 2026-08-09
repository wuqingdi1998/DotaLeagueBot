import Image from "next/image";
import { FaStar } from "react-icons/fa";
import { FiChevronDown, FiFlag, FiGift } from "react-icons/fi";
import { PlayerProfileLink } from "@/app/components/PlayerProfileLink";
import { keepGroupedNumbersTogether } from "../model/star-race";
import type { CompendiumStarRaceArchive as ArchivedRace } from "./types";

const phaseLabels = {
  upcoming: "Запланирована",
  active: "Идёт сейчас",
  finished: "Завершена",
} as const;

function RaceScenario({ race }: { race: ArchivedRace }) {
  return (
    <div className="compendium-base-race-scenario">
      <div className="compendium-base-race-prizes">
        {race.prizes.map((prize) => (
          <article key={prize.place}>
            <Image
              src={prize.imageUrl}
              alt=""
              width={96}
              height={54}
              unoptimized
            />
            <span><FiGift aria-hidden="true" /> Топ-{prize.place}</span>
            <strong>{prize.title}</strong>
          </article>
        ))}
      </div>
      <div className="compendium-base-race-quests">
        {race.quests.map((quest) => (
          <article key={quest.dateKey}>
            <span>{quest.weekday} · {quest.dateLabel}</span>
            <strong>{quest.title ?? "Задание не задано"}</strong>
            {quest.description && (
              <p>{keepGroupedNumbersTogether(quest.description)}</p>
            )}
            {quest.rewardStars !== null && (
              <small><FaStar aria-hidden="true" /> {quest.rewardStars}</small>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function RaceStandings({ race }: { race: ArchivedRace }) {
  const heading = race.phase === "finished"
    ? "Итоговая таблица"
    : "Текущая таблица";
  return (
    <section className="compendium-base-race-results">
      <h3>{heading}</h3>
      {race.participants.length ? (
        <div role="table" aria-label={`Результаты: ${race.dateLabel}`}>
          {race.participants.map((participant) => (
            <div role="row" key={participant.playerId}>
              <strong role="cell">{participant.rank}</strong>
              <span role="cell">
                <PlayerProfileLink
                  dotaId={participant.dotaId}
                  nickname={participant.playerName}
                >
                  {participant.playerName}
                </PlayerProfileLink>
              </span>
              <span role="cell">
                {participant.completedQuests ?? 0}/{race.quests.length} заданий
              </span>
              <b role="cell"><FaStar aria-hidden="true" /> {participant.totalStars}</b>
            </div>
          ))}
        </div>
      ) : (
        <p>Результаты появятся здесь после старта недели.</p>
      )}
    </section>
  );
}

export function CompendiumStarRaceArchive({
  races,
}: {
  races: ArchivedRace[];
}) {
  return (
    <section className="compendium-base-race-archive">
      <div className="compendium-base-list-heading">
        <div>
          <span>Архив для организаторов</span>
          <h2>Сценарии Гонки</h2>
        </div>
        <p>Задания, награды и результаты каждой недели</p>
      </div>
      <div className="compendium-base-race-weeks">
        {races.map((race, index) => (
          <details key={race.id} open={index === 0}>
            <summary>
              <FiFlag aria-hidden="true" />
              <span>
                <strong>{race.title}</strong>
                <small>{race.dateLabel}</small>
              </span>
              <b className={race.phase}>{phaseLabels[race.phase]}</b>
              <FiChevronDown aria-hidden="true" />
            </summary>
            <RaceScenario race={race} />
            <RaceStandings race={race} />
          </details>
        ))}
      </div>
    </section>
  );
}
