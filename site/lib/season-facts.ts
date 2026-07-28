export const minimumSeasonFactCount = 1;
export const maximumSeasonFactCount = 9;

export type SeasonFactInput = {
  value?: string;
  label?: string;
};

export type NormalizedSeasonFact = {
  value: string;
  label: string;
};

export function normalizeSeasonFacts(
  facts: SeasonFactInput[],
): NormalizedSeasonFact[] {
  return facts.map((fact) => ({
    value: String(fact.value ?? "").trim(),
    label: String(fact.label ?? "").trim(),
  }));
}

export function seasonFactsValidationError(
  facts: NormalizedSeasonFact[],
): string | null {
  if (
    facts.length < minimumSeasonFactCount ||
    facts.length > maximumSeasonFactCount
  ) {
    return "В сезонной полосе должно быть от 1 до 9 сегментов";
  }
  if (facts.some((fact) => !fact.value || !fact.label)) {
    return "Заполните значение и подпись каждого сегмента";
  }
  if (facts.some((fact) => fact.value.length > 40)) {
    return "Значение сегмента не должно превышать 40 символов";
  }
  if (facts.some((fact) => fact.label.length > 120)) {
    return "Подпись сегмента не должна превышать 120 символов";
  }
  return null;
}

export function defaultSeasonFacts(
  roundCount: number,
  publishedRoundCount: number,
): NormalizedSeasonFact[] {
  return [
    {
      value: String(roundCount),
      label: "Всего туров в сезоне",
    },
    {
      value: String(publishedRoundCount),
      label: "Опубликовано организатором",
    },
  ];
}
