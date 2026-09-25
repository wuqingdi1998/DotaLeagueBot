import Link from "next/link";
import { FaCheck, FaStar } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import {
  communityCompendiumRewards,
  personalCompendiumRewards,
  type RewardMilestone,
} from "../model/rewards";
import { ProfileEventBadge } from "@/app/components/ProfileEventBadge";

function RewardTrack({
  title,
  stars,
  rewards,
  kind,
  isPreview,
}: {
  title: string;
  stars: number;
  rewards: readonly RewardMilestone[];
  kind: "personal" | "community";
  isPreview: boolean;
}) {
  const maximum = rewards.at(-1)?.stars ?? 1;
  const progress = Math.min(100, (stars / maximum) * 100);
  return (
    <section className={`compendium-reward-track compendium-reward-track-${kind}`}>
      <div className="compendium-reward-track-heading">
        <div>
          <span>Награды компендиума</span>
          <h2>{title}</h2>
        </div>
        {kind === "community" && !isPreview ? (
          <Link
            className="compendium-community-stars-link"
            href="/compendium/leaderboard"
            aria-label={`Открыть рейтинг участников: ${stars} звёзд сообщества`}
          >
            <FaStar aria-hidden="true" /> {stars}
            <FiArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <strong><FaStar aria-hidden="true" /> {stars}</strong>
        )}
      </div>
      <div className="compendium-reward-progress" aria-hidden="true">
        <span className="compendium-reward-progress-fill" style={{ width: `${progress}%` }} />
        <div className="compendium-reward-markers">
          {rewards.map((reward) => {
            const markerPosition = Math.min(100, (reward.stars / maximum) * 100);
            const isUnlocked = stars >= reward.stars;
            return (
              <span
                className={`compendium-reward-marker${isUnlocked ? " unlocked" : ""}`}
                key={reward.stars}
                style={{ left: `${markerPosition}%` }}
              >
                <strong>{reward.stars}</strong>
              </span>
            );
          })}
        </div>
      </div>
      {!isPreview && (
        <p className="compendium-reward-swipe-hint">
          Листайте награды влево и вправо
          <FiArrowRight aria-hidden="true" />
        </p>
      )}
      <div className="compendium-reward-milestones">
        {isPreview && rewards.length === 0 && (
          <article>
            <h3>Награды выберем позже</h3>
            <p>{kind === "personal"
              ? "Звёзды за задания будут учитываться здесь. Дополнительные награды за личные звёзды пока не выбраны."
              : "Звёзды всех участников складываются. Общие награды и их пороги пока не выбраны."}</p>
          </article>
        )}
        {rewards.map((reward) => {
          const isUnlocked = stars >= reward.stars;
          const badgeKeys = kind === "personal"
            ? reward.badgeKeys ?? (reward.badgeKey ? [reward.badgeKey] : [])
            : [];
          return (
            <article
              className={isUnlocked ? "unlocked" : "locked"}
              key={reward.stars}
            >
              <div className="compendium-milestone-topline">
                <div className="compendium-milestone-stars">
                  <FaStar aria-hidden="true" />
                  <strong>{reward.stars}</strong>
                </div>
                {isUnlocked && (
                  <span className="compendium-milestone-unlocked">
                    <FaCheck aria-hidden="true" /> получено
                  </span>
                )}
              </div>
              <h3>{reward.title}</h3>
              {badgeKeys.map((badgeKey) => (
                <ProfileEventBadge key={badgeKey} badgeKey={badgeKey} />
              ))}
              <p>{reward.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CompendiumRewards({
  personalStars,
  communityStars,
  isPreview = false,
  showCommunity = true,
  personalRewards,
}: {
  personalStars: number;
  communityStars: number;
  isPreview?: boolean;
  showCommunity?: boolean;
  personalRewards?: readonly RewardMilestone[];
}) {
  return (
    <div className="compendium-rewards">
      <RewardTrack
        title="Личный зачёт"
        stars={personalStars}
        rewards={personalRewards ?? (isPreview ? [] : personalCompendiumRewards)}
        kind="personal"
        isPreview={isPreview}
      />
      {showCommunity && (
        <RewardTrack
          title="Зачёт сообщества"
          stars={communityStars}
          rewards={isPreview ? [] : communityCompendiumRewards}
          kind="community"
          isPreview={isPreview}
        />
      )}
    </div>
  );
}
