import { describe, expect, it } from "vitest";
import { compareReleases, type ReleaseManifest } from "./releases";

const manifest: ReleaseManifest = {
  revision: "third",
  baselineRevision: "first",
  changes: [
    { revision: "third", title: "Обновление матчей", createdAt: "2026-10-28" },
    { revision: "second", title: "Обновление календаря", createdAt: "2026-10-27" },
  ],
};

describe("comparison with the actual running release", () => {
  it("lists all unpublished changes relative to the known live version", () => {
    expect(compareReleases(manifest, "first")).toMatchObject({ status: "ahead", changes: manifest.changes });
  });
  it("removes changes that have since been published", () => {
    expect(compareReleases(manifest, "second")).toMatchObject({ status: "ahead", changes: [manifest.changes[0]] });
  });
  it("reports matching versions after publication", () => {
    expect(compareReleases(manifest, "third")).toMatchObject({ status: "equal", changes: [] });
  });
  it.each([null, "unknown", "unrelated", "newer-live-version"])("does not invent differences for %s", (live) => {
    expect(compareReleases(manifest, live)).toMatchObject({ status: "unavailable", changes: [] });
  });
});
