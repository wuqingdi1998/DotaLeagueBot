import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const snapshotService = source("app/fearless-draft/server/snapshot-service.ts");
const seriesService = source("app/fearless-draft/server/series-service.ts");
const agreementService = source("app/fearless-draft/server/agreement-service.ts");
const serverNowHook = source("app/fearless-draft/hooks/useServerNow.ts");
const timerModel = source("app/fearless-draft/model/timer.ts");

describe("Fearless Draft server clock contract", () => {
  it("publishes the database clock in every snapshot", () => {
    expect(snapshotService).toContain("databaseNow(client)");
    expect(snapshotService).not.toContain("serverNow: new Date().toISOString()");
  });

  it("settles draft actions and agreements against the database clock", () => {
    expect(seriesService).toContain("databaseNow(client)");
    expect(seriesService).not.toContain("new Date()");
    expect(agreementService).toContain("databaseNow(client)");
    expect(agreementService).not.toContain("Date.now()");
  });

  it("advances the synchronized clock without reading the user's wall clock", () => {
    expect(serverNowHook).toContain("performance.now()");
    expect(serverNowHook).not.toContain("Date.now()");
    expect(timerModel).not.toContain("now = new Date()");
  });
});
