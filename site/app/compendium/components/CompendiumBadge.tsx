import type { CompendiumBadgeTier } from "../model/rewards";

const badgeLabels: Record<CompendiumBadgeTier, string> = {
  bronze: "Бронзовый бейдж TI 2026",
  silver: "Серебряный бейдж TI 2026",
  gold: "Золотой бейдж TI 2026",
};

export function CompendiumBadge({ tier }: { tier: CompendiumBadgeTier }) {
  return (
    <span
      className={`compendium-ti-badge compendium-ti-badge-${tier}`}
      title={badgeLabels[tier]}
      aria-label={badgeLabels[tier]}
    >
      <span className="compendium-ti-badge-mark" aria-hidden="true">TI</span>
      <span aria-hidden="true">2026</span>
    </span>
  );
}
