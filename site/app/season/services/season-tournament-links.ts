import "server-only";

import { one, query } from "@/lib/db";
import {
  normalizeSeasonTournamentHref,
  seasonTournamentLinkIds,
  type SeasonTournamentLinkId,
  type SeasonTournamentLinks,
} from "../model/season-overview-model";

const seasonTournamentLinksSettingKey = "season_tournament_links";

type SeasonTournamentLinksRow = {
  value: unknown;
};

export async function getSeasonTournamentLinks(): Promise<SeasonTournamentLinks> {
  const row = await one<SeasonTournamentLinksRow>(
    "SELECT value FROM site_settings WHERE key = $1",
    [seasonTournamentLinksSettingKey],
  );
  if (!row?.value || typeof row.value !== "object" || Array.isArray(row.value)) {
    return {};
  }

  const storedLinks = row.value as Record<string, unknown>;
  return seasonTournamentLinkIds.reduce<SeasonTournamentLinks>(
    (links, linkId) => {
      const href = normalizeSeasonTournamentHref(storedLinks[linkId]);
      if (href) links[linkId] = href;
      return links;
    },
    {},
  );
}

export async function saveSeasonTournamentLink(input: {
  linkId: SeasonTournamentLinkId;
  href: string;
  organizerId: string;
}): Promise<void> {
  await query(
    `INSERT INTO site_settings (key, value, updated_at, updated_by)
     VALUES ($1, jsonb_build_object($2::text, $3::text), NOW(), $4)
     ON CONFLICT (key) DO UPDATE
     SET value = CASE
           WHEN jsonb_typeof(site_settings.value) = 'object'
             THEN site_settings.value
           ELSE '{}'::jsonb
         END || EXCLUDED.value,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by`,
    [
      seasonTournamentLinksSettingKey,
      input.linkId,
      input.href,
      input.organizerId,
    ],
  );
}
