import {
  profileBadgeDefinition,
  type ProfileBadgeKey,
} from "@/lib/profile-badges";

export function ProfileEventBadge({ badgeKey }: { badgeKey: ProfileBadgeKey }) {
  const badge = profileBadgeDefinition(badgeKey);
  if (!badge) return null;

  return (
    <span
      className={`profile-event-badge profile-event-badge-${badge.tier}`}
      title={badge.label}
      aria-label={badge.label}
    >
      <span className="profile-event-badge-mark" aria-hidden="true">TI</span>
      <span aria-hidden="true">{badge.shortLabel}</span>
    </span>
  );
}
