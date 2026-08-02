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
      <svg
        className="profile-event-badge-aegis"
        viewBox="0 0 64 72"
        aria-hidden="true"
      >
        <path className="aegis-wings" d="M10 16 1 24l8 6-6 9 10 4M54 16l9 8-8 6 6 9-10 4" />
        <path className="aegis-crown" d="m18 10 5-7 9 5 9-5 5 7-4 7H22z" />
        <path className="aegis-shield" d="M32 9c14 0 23 9 23 23 0 18-10 29-23 37C19 61 9 50 9 32 9 18 18 9 32 9Z" />
        <circle className="aegis-ring" cx="32" cy="34" r="17" />
        <path className="aegis-rune" d="m22 23 22 8-8 22-7-13-9 5 4-12z" />
      </svg>
      <span aria-hidden="true">{badge.shortLabel}</span>
    </span>
  );
}
