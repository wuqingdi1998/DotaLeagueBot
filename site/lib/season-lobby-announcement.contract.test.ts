import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const actions = source(
  "../app/api/admin/season/season-lobby-configuration-actions.ts",
);
const announcements = source(
  "../app/api/admin/season/season-lobby-announcement-actions.ts",
);
const migration = source(
  "../../bot/database/migrations/0115_season_lobby_announcements.sql",
);
const reportMigration = source(
  "../../bot/database/migrations/0116_season_lobby_announcement_reports.sql",
);
const dockerfile = source("../../bot/Dockerfile");
const deploy = source("../../.github/workflows/deploy.yml");

describe("season lobby announcement contract", () => {
  it("queues an announcement only through the publish transition", () => {
    const publishStart = actions.indexOf('action === "publish"');
    const unpublishStart = actions.indexOf('action === "unpublish"');
    const publishBlock = actions.slice(publishStart, unpublishStart);

    expect(publishBlock).toContain(
      "queueSeasonLobbyPublishedAnnouncement(client, roundId)",
    );
    expect(announcements).toContain("ON CONFLICT (dedupe_key) DO NOTHING");
    expect(announcements).toContain(
      "season-lobby-published-tournament-%s-round-%s",
    );
  });

  it("uses the configured channel, tournament text, schedule and image", () => {
    expect(migration).toContain("1038761680521416754");
    expect(migration).toContain("Linken''s Sphere 5x5 League");
    expect(migration).toContain("'Lob'");
    expect(announcements).toContain("round.scheduled_at AT TIME ZONE");
    expect(announcements).toContain("'DD.MM.YYYY'");
    expect(announcements).toContain("'HH24:MI'");
    expect(announcements).toContain("%s-го тура %s %s (%s)");
  });

  it("reports each successful real announcement to frokeng", () => {
    expect(reportMigration).toContain("311247030422863882");
    expect(reportMigration).toContain("анонсы-и-новости");
    expect(announcements).toContain("settings.report_recipient_id");
    expect(announcements).toContain("'pending'");
    expect(announcements).toContain(
      "анонс публикации лобби на тур №%s – %s",
    );
  });

  it("queues all fourteen paused previews for the requested test channel", () => {
    expect(migration).toContain("1461860575259660408");
    expect(migration).toContain("round.round_number BETWEEN 1 AND 14");
    expect(migration).toContain("'infinity'::TIMESTAMPTZ");
    expect(deploy).toContain(
      "Delivered season 9 lobby preview announcements: 14",
    );
    expect(deploy).toContain('if [ "$lobby_preview_delivery" = "14|0" ]');
  });

  it("packages every lobby announcement image into the bot", () => {
    expect(dockerfile).toContain(
      "COPY anounce/Lob/ ./assets/channel-announcements/",
    );
    for (let roundNumber = 1; roundNumber <= 14; roundNumber += 1) {
      expect(
        existsSync(
          new URL(`../../anounce/Lob/Lob${roundNumber}.png`, import.meta.url),
        ),
      ).toBe(true);
    }
  });
});
