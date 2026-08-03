import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import {
  FiArrowLeft,
  FiChevronDown,
  FiExternalLink,
  FiUsers,
} from "react-icons/fi";
import type {
  CompendiumAdminRewardHistory,
  CompendiumAdminParticipant,
  CompendiumQuestRewardHistory,
  CompendiumPredictionRewardHistory,
  CompendiumRuneRewardHistory,
  CompendiumRewardHistory,
} from "./types";

function RuneRewardHistoryItem({
  reward,
}: {
  reward: CompendiumRuneRewardHistory;
}) {
  return (
    <article className="compendium-base-reward compendium-base-rune-reward">
      <div className="compendium-base-reward-heading">
        <div>
          <span>{reward.dateLabel}</span>
          <strong>Испытание Рун: {reward.hero.name}</strong>
        </div>
        <span className="compendium-base-reward-value">
          <FaStar aria-hidden="true" /> +{reward.rewardAmount}
        </span>
      </div>
      <a
        className="compendium-base-match-link"
        href={`https://www.opendota.com/matches/${reward.matchedMatchId}`}
        target="_blank"
        rel="noreferrer"
      >
        Победа в матче {reward.matchedMatchId}
        <FiExternalLink aria-hidden="true" />
      </a>
    </article>
  );
}

function PredictionRewardHistoryItem({
  reward,
}: {
  reward: CompendiumPredictionRewardHistory;
}) {
  return (
    <article className="compendium-base-reward compendium-base-prediction-reward">
      <div className="compendium-base-reward-heading">
        <div>
          <span>{reward.dateLabel}</span>
          <strong>Прогноз: {reward.teamAName} — {reward.teamBName}</strong>
          <small>Выбор {reward.predictedScore} · итог {reward.actualScore}</small>
        </div>
        <span className="compendium-base-reward-value">
          <FaStar aria-hidden="true" /> +{reward.rewardAmount}
        </span>
      </div>
    </article>
  );
}

function QuestRewardHistoryItem({
  reward,
}: {
  reward: CompendiumQuestRewardHistory;
}) {
  return (
    <article className="compendium-base-reward">
      <div className="compendium-base-reward-heading">
        <div>
          <span>{reward.dateLabel}</span>
          <strong>Испытание {reward.questPosition}</strong>
        </div>
        <span className="compendium-base-reward-value">
          <FaStar aria-hidden="true" /> +{reward.rewardAmount}
        </span>
      </div>
      <div className="compendium-base-heroes" aria-label="Герои задания">
        {reward.heroes.map((hero) => {
          const isWinner = hero.id === reward.matchedHeroId;
          return (
            <span
              className={isWinner ? "winner" : undefined}
              key={hero.id}
            >
              {isWinner && <FaStar aria-hidden="true" />}
              {hero.name}
            </span>
          );
        })}
      </div>
      <a
        className="compendium-base-match-link"
        href={`https://www.opendota.com/matches/${reward.matchedMatchId}`}
        target="_blank"
        rel="noreferrer"
      >
        Победа в матче {reward.matchedMatchId}
        <FiExternalLink aria-hidden="true" />
      </a>
    </article>
  );
}

function AdminRewardHistoryItem({
  reward,
}: {
  reward: CompendiumAdminRewardHistory;
}) {
  const isAdded = reward.rewardAmount > 0;
  return (
    <article
      className={`compendium-base-reward compendium-base-admin-reward ${
        isAdded ? "added" : "removed"
      }`}
    >
      <div className="compendium-base-reward-heading">
        <div>
          <span>{reward.dateLabel}</span>
          <strong>{isAdded ? "Выдано админом" : "Снято админом"}</strong>
          <small>Администратор: {reward.administratorName}</small>
        </div>
        <span className="compendium-base-reward-value">
          <FaStar aria-hidden="true" />
          {isAdded ? "+" : "−"}
          {Math.abs(reward.rewardAmount)}
        </span>
      </div>
    </article>
  );
}

function RewardHistoryItem({ reward }: { reward: CompendiumRewardHistory }) {
  if (reward.kind === "rune") {
    return <RuneRewardHistoryItem reward={reward} />;
  }
  if (reward.kind === "prediction") {
    return <PredictionRewardHistoryItem reward={reward} />;
  }
  return reward.kind === "admin" ? (
    <AdminRewardHistoryItem reward={reward} />
  ) : (
    <QuestRewardHistoryItem reward={reward} />
  );
}

function ParticipantHistory({
  participant,
}: {
  participant: CompendiumAdminParticipant;
}) {
  return (
    <details className="compendium-base-participant">
      <summary>
        <span className="compendium-base-avatar">
          {participant.avatarUrl ? (
            <Image
              src={participant.avatarUrl}
              alt={`Аватар ${participant.playerName}`}
              width={44}
              height={44}
              unoptimized
            />
          ) : (
            <span aria-hidden="true">
              {participant.playerName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>
        <span className="compendium-base-player-name">
          <strong>{participant.playerName}</strong>
          <small>
            Dota ID:{" "}
            <Link href={`/players/${participant.dotaId}`}>
              {participant.dotaId}
            </Link>
          </small>
        </span>
        <span className="compendium-base-stars">
          <FaStar aria-hidden="true" /> {participant.totalStars}
        </span>
        <span className="compendium-base-history-count">
          {participant.rewards.length} операций
        </span>
        <FiChevronDown className="compendium-base-chevron" aria-hidden="true" />
      </summary>
      <div className="compendium-base-history">
        {participant.rewards.length ? (
          participant.rewards.map((reward) => (
            <RewardHistoryItem key={reward.id} reward={reward} />
          ))
        ) : (
          <p className="compendium-base-empty-history">
            Этот участник пока не получил ни одной звезды.
          </p>
        )}
      </div>
    </details>
  );
}

export function CompendiumBase({
  participants,
}: {
  participants: CompendiumAdminParticipant[];
}) {
  const totalStars = participants.reduce(
    (sum, participant) => sum + participant.totalStars,
    0,
  );
  const rewardedParticipants = participants.filter(
    (participant) => participant.totalStars > 0,
  ).length;

  return (
    <div className="compendium-base-page">
      <section className="compendium-base-hero">
        <Link href="/compendium" className="compendium-base-back">
          <FiArrowLeft aria-hidden="true" /> Вернуться в компендиум
        </Link>
        <span className="compendium-base-kicker">Только для организаторов</span>
        <h1>База компендиума</h1>
        <p>
          Нажмите на участника, чтобы увидеть каждый день, состав задания и
          героя, победа на котором принесла звезду, а также ручные изменения.
        </p>
        <div className="compendium-base-totals">
          <div><FiUsers aria-hidden="true" /><strong>{participants.length}</strong><span>участников</span></div>
          <div><FaStar aria-hidden="true" /><strong>{totalStars}</strong><span>звёзд выдано</span></div>
          <div><FaStar aria-hidden="true" /><strong>{rewardedParticipants}</strong><span>получили звёзды</span></div>
        </div>
      </section>

      <section className="compendium-base-list">
        <div className="compendium-base-list-heading">
          <div>
            <span>Участники сообщества</span>
            <h2>Звёзды и история побед</h2>
          </div>
          <p>{participants.length} записей</p>
        </div>
        {participants.length ? (
          <div className="compendium-base-participants">
            {participants.map((participant) => (
              <ParticipantHistory
                key={participant.discordId}
                participant={participant}
              />
            ))}
          </div>
        ) : (
          <div className="compendium-base-empty">Участников пока нет.</div>
        )}
      </section>
    </div>
  );
}
