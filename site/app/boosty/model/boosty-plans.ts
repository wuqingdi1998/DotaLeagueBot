export const boostyBenefits = [
  {
    id: "fastcup",
    label: "Участие в Fastcup-турнирах 9-го сезона",
  },
  {
    id: "discord-role",
    label: "Уникальная роль, цвет ника и значок рядом с ником в Discord",
  },
  {
    id: "general-media",
    label: "Гифки, голосовые сообщения и опросы в генерал-чате",
  },
  {
    id: "early-registration",
    label: "Предрегистрация на матчи лиги на сутки раньше",
  },
  {
    id: "slow-mode",
    label: "Защита от медленного режима в генерал-чате",
  },
  {
    id: "custom-role",
    label: "Кастомная роль: собственный цвет ника и значок в Discord",
  },
  {
    id: "gradient-name",
    label: "Градиентный цвет никнейма",
  },
] as const;

export type BoostyBenefitId = (typeof boostyBenefits)[number]["id"];

export type BoostyPlan = {
  id: string;
  name: string;
  level: string;
  price: string;
  note?: string;
  color: string;
  benefitIds: readonly BoostyBenefitId[];
};

const commonRuneBenefits = ["fastcup", "discord-role"] as const;
const premiumRuneBenefits = [
  ...commonRuneBenefits,
  "general-media",
  "early-registration",
] as const;

export const boostyPlans: readonly BoostyPlan[] = [
  {
    id: "water",
    name: "Руна Воды",
    level: "Basic",
    price: "110 ₽/месяц",
    color: "#38bfe5",
    benefitIds: commonRuneBenefits,
  },
  {
    id: "regeneration",
    name: "Руна Регенерации",
    level: "Premium1",
    price: "245 ₽/месяц",
    color: "#50c957",
    benefitIds: premiumRuneBenefits,
  },
  {
    id: "illusion",
    name: "Руна Иллюзий",
    level: "Premium2",
    price: "246 ₽/месяц",
    color: "#e8dc73",
    benefitIds: premiumRuneBenefits,
  },
  {
    id: "arcane",
    name: "Руна Волшебства",
    level: "Premium3",
    price: "247 ₽/месяц",
    color: "#b34ee8",
    benefitIds: premiumRuneBenefits,
  },
  {
    id: "invisibility",
    name: "Руна Невидимости",
    level: "Premium4",
    price: "248 ₽/месяц",
    color: "#5914a0",
    benefitIds: premiumRuneBenefits,
  },
  {
    id: "haste",
    name: "Руна Ускорения",
    level: "Premium5",
    price: "249 ₽/месяц",
    color: "#e32222",
    benefitIds: premiumRuneBenefits,
  },
  {
    id: "damage",
    name: "Руна Усиления урона",
    level: "Premium6",
    price: "250 ₽/месяц",
    color: "#244ae7",
    benefitIds: premiumRuneBenefits,
  },
  {
    id: "supporter",
    name: "Суппортеры",
    level: "VIP",
    price: "2 000 ₽/сезон",
    note: "до конца декабря",
    color: "#f0bd29",
    benefitIds: boostyBenefits.map((benefit) => benefit.id),
  },
];
