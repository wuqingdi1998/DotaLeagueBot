import Image from "next/image";
import type { SubscriptionRoleName } from "@/lib/subscription-roles";

const runePresentation: Record<
  SubscriptionRoleName,
  { nicknameClass: string; icon: string }
> = {
  "Руна Воды": {
    nicknameClass: "water",
    icon: "/participant-runes/water.png",
  },
  "Руна Усиления урона": {
    nicknameClass: "damage",
    icon: "/participant-runes/damage.png",
  },
  "Руна Иллюзий": {
    nicknameClass: "illusion",
    icon: "/participant-runes/illusion.png",
  },
  "Руна Волшебства": {
    nicknameClass: "arcane",
    icon: "/participant-runes/arcane.png",
  },
  "Руна Невидимости": {
    nicknameClass: "invisibility",
    icon: "/participant-runes/invisibility.png",
  },
  "Руна Ускорения": {
    nicknameClass: "haste",
    icon: "/participant-runes/haste.png",
  },
  "Руна Регенерации": {
    nicknameClass: "regeneration",
    icon: "/participant-runes/regeneration.png",
  },
};

export function SubscriptionRuneNickname({
  nickname,
  subscriptionRole,
}: {
  nickname: string;
  subscriptionRole: SubscriptionRoleName | null;
}) {
  if (!subscriptionRole) return nickname;
  const presentation = runePresentation[subscriptionRole];

  return (
    <span className="subscription-rune-identity">
      <span
        className={`subscription-rune-nickname subscription-rune-nickname-${presentation.nicknameClass}`}
      >
        {nickname}
      </span>
      <Image
        className="subscription-rune-icon"
        src={presentation.icon}
        alt=""
        title={subscriptionRole}
        width={24}
        height={24}
      />
    </span>
  );
}
