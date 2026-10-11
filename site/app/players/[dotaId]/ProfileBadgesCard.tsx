"use client";

import { ProfileEventBadge } from "@/app/components/ProfileEventBadge";
import type { ProfileBadgeKey } from "@/lib/profile-badges";
import { useProfileBadges } from "./useProfileBadges";

export function ProfileBadgesCard({
  badgeKeys,
  dotaId,
}: {
  badgeKeys: readonly ProfileBadgeKey[];
  dotaId?: string;
}) {
  const visibleBadgeKeys = useProfileBadges(badgeKeys, dotaId);
  return (
    <section className="profile-side-card profile-badges-card">
      <p className="section-kicker">Ивенты</p>
      <h2>Бейджи</h2>
      {visibleBadgeKeys.length ? (
        <ul className="profile-badges-list" aria-label="Бейджи игрока">
          {visibleBadgeKeys.map((badgeKey) => (
            <li key={badgeKey}>
              <ProfileEventBadge badgeKey={badgeKey} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-badges-empty">Бейджей пока нет.</p>
      )}
    </section>
  );
}
