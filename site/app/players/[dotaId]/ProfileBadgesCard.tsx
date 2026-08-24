import { ProfileEventBadge } from "@/app/components/ProfileEventBadge";
import type { ProfileBadgeKey } from "@/lib/profile-badges";

export function ProfileBadgesCard({
  badgeKeys,
}: {
  badgeKeys: readonly ProfileBadgeKey[];
}) {
  return (
    <section className="profile-side-card profile-badges-card">
      <p className="section-kicker">Ивенты</p>
      <h2>Бейджи</h2>
      {badgeKeys.length ? (
        <ul className="profile-badges-list" aria-label="Бейджи игрока">
          {badgeKeys.map((badgeKey) => (
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
