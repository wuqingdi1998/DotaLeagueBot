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
        viewBox="0 0 84 76"
        aria-hidden="true"
      >
        <path className="aegis-frame" d="M42 3C21 3 8 16 7 35L2 42l7 7-4 10 13 2 5 10h38l5-10 13-2-4-10 7-7-5-7C76 16 63 3 42 3Z" />
        <circle className="aegis-disc" cx="42" cy="37" r="29" />
        <circle className="aegis-ring" cx="42" cy="37" r="24" />
        <g className="aegis-blades">
          <path d="M42 14c13 0 23 9 24 21-7-5-15-7-23-2-3-6-3-12-1-19Z" />
          <path d="M42 14c13 0 23 9 24 21-7-5-15-7-23-2-3-6-3-12-1-19Z" transform="rotate(120 42 37)" />
          <path d="M42 14c13 0 23 9 24 21-7-5-15-7-23-2-3-6-3-12-1-19Z" transform="rotate(240 42 37)" />
        </g>
        <circle className="aegis-medallion" cx="42" cy="37" r="8" />
        <path className="aegis-rune" d="m36 31 13 4-5 10-3-6-6 2 3-5z" />
        <path className="aegis-ornament" d="M21 12c5 3 9 4 15 4M48 16c6 0 10-1 15-4M14 53l8 2 4 10M70 53l-8 2-4 10" />
      </svg>
      <span aria-hidden="true">{badge.shortLabel}</span>
    </span>
  );
}
