import type { SubscriptionRoleName } from "@/lib/subscription-roles";

const runeNicknameClass: Record<SubscriptionRoleName, string> = {
  "Руна Воды": "water",
  "Руна Усиления урона": "damage",
  "Руна Иллюзий": "illusion",
  "Руна Волшебства": "arcane",
  "Руна Невидимости": "invisibility",
  "Руна Ускорения": "haste",
  "Руна Регенерации": "regeneration",
};

export function ParticipantRuneNickname({
  nickname,
  subscriptionRole,
}: {
  nickname: string;
  subscriptionRole: SubscriptionRoleName | null;
}) {
  if (!subscriptionRole) return nickname;

  return (
    <span
      className={`participant-rune-nickname participant-rune-nickname-${runeNicknameClass[subscriptionRole]}`}
    >
      {nickname}
    </span>
  );
}
