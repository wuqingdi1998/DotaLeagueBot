import { OCTOBER_COMPENDIUM_DATE_LABEL } from "@/lib/october-compendium-schedule";
import type { CompendiumPeriod } from "./period";

type CompendiumArchive = {
  period: CompendiumPeriod;
  number: number;
  label: string;
  pageHref: string;
  resultsHref: string;
  baseHref: string;
};

export const COMPENDIUM_ARCHIVES: Record<CompendiumPeriod, CompendiumArchive> = {
  "ti-2026": {
    period: "ti-2026",
    number: 1,
    label: "The International 2026",
    pageHref: "/organizer/compendium",
    resultsHref: "/organizer/compendium/results",
    baseHref: "/organizer/compendium/base",
  },
  october: {
    period: "october",
    number: 2,
    label: OCTOBER_COMPENDIUM_DATE_LABEL,
    pageHref: "/organizer/compendium-october",
    resultsHref: "/organizer/compendium-october/results",
    baseHref: "/compendium/base",
  },
};
