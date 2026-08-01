import { FaStar } from "react-icons/fa";
import {
  compendiumBadgeForStars,
  communityCompendiumRewards,
  personalCompendiumRewards,
} from "../model/rewards";
import { CompendiumBadge } from "./CompendiumBadge";

type Reward = {
  readonly stars: number;
  readonly title: string;
  readonly description: string;
};

function RewardTrack({
  title,
  stars,
  rewards,
  kind,
}: {
  title: string;
  stars: number;
  rewards: readonly Reward[];
  kind: "personal" | "community";
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
        <strong><FaStar aria-hidden="true" /> {stars}</strong>
      </div>
      <div className="compendium-reward-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="compendium-reward-milestones">
        {rewards.map((reward) => {
          const isUnlocked = stars >= reward.stars;
          const badgeTier = kind === "personal" && [10, 40, 75].includes(reward.stars)
            ? compendiumBadgeForStars(reward.stars)
            : null;
          return (
            <article className={isUnlocked ? "unlocked" : ""} key={reward.stars}>
              <div className="compendium-milestone-stars">
                <FaStar aria-hidden="true" />
                <strong>{reward.stars}</strong>
              </div>
              <h3>{reward.title}</h3>
              {badgeTier && <CompendiumBadge tier={badgeTier} />}
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
}: {
  personalStars: number;
  communityStars: number;
}) {
  return (
    <div className="compendium-rewards">
      <RewardTrack
        title="Личный зачёт"
        stars={personalStars}
        rewards={personalCompendiumRewards}
        kind="personal"
      />
      <RewardTrack
        title="Зачёт сообщества"
        stars={communityStars}
        rewards={communityCompendiumRewards}
        kind="community"
      />
    </div>
  );
}
