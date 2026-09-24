import Link from "next/link";
import { FaCheck, FaStar } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import {
  communityCompendiumRewards,
  personalCompendiumRewards,
} from "../model/rewards";
import { ProfileEventBadge } from "@/app/components/ProfileEventBadge";
import type { ProfileBadgeKey } from "@/lib/profile-badges";

type Reward = {
  readonly stars: number;
  readonly title: string;
  readonly description: string;
  readonly badgeKey?: ProfileBadgeKey;
};

function RewardTrack({
  title,
  stars,
  rewards,
  kind,
  isPreview,
}: {
  title: string;
  stars: number;
  rewards: readonly Reward[];
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
        {isPreview && (
          <article className="locked">
            <h3>Награды выберем позже</h3>
            <p>{kind === "personal"
              ? "Звёзды за задания будут учитываться здесь. Пороги и личные награды пока не утверждены."
              : "Звёзды всех участников складываются. Общие награды и пороги пока не утверждены."}</p>
          </article>
        )}
        {rewards.map((reward) => {
          const isUnlocked = stars >= reward.stars;
          const badgeTier = kind === "personal" ? reward.badgeKey ?? null : null;
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
              {badgeTier && <ProfileEventBadge badgeKey={badgeTier} />}
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
}: {
  personalStars: number;
  communityStars: number;
  isPreview?: boolean;
}) {
  return (
    <div className="compendium-rewards">
      <RewardTrack
        title="Личный зачёт"
        stars={personalStars}
        rewards={isPreview ? [] : personalCompendiumRewards}
        kind="personal"
        isPreview={isPreview}
      />
      <RewardTrack
        title="Зачёт сообщества"
        stars={communityStars}
        rewards={isPreview ? [] : communityCompendiumRewards}
        kind="community"
        isPreview={isPreview}
      />
    </div>
  );
}
