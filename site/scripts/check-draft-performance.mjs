import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { build } from "vite";
import { createDraftPerformanceRuntime, draftPerformanceHelp } from "./draft-performance-runtime.mjs";

if (process.argv.includes("--help")) {
  console.log(draftPerformanceHelp);
  process.exit(0);
}

const root = new URL("../", import.meta.url);
const migrations = new URL("../../bot/database/migrations/", import.meta.url);
const output = new URL(".data/draft-performance/", root);
const runId = randomUUID();
const databasePort = 55438;
const sitePort = 3024;
const baseUrl = `http://127.0.0.1:${sitePort}`;
const databaseUser = "draftperf";
const databasePassword = randomBytes(18).toString("hex");
const players = Array.from({ length: 20 }, (_, index) => ({
  id: String(10001 + index), token: randomBytes(24).toString("hex"),
}));
const modelBuild = await build({ configFile: false, logLevel: "error", build: {
  write: false, minify: false, lib: {
    entry: fileURLToPath(new URL("scripts/draft-performance-model.ts", root)), formats: ["es"],
  },
} });
const modelOutput = Array.isArray(modelBuild) ? modelBuild[0].output : modelBuild.output;
const modelCode = modelOutput.find((chunk) => chunk.type === "chunk" && chunk.isEntry)?.code;
assert.ok(modelCode, "Load the shared enabled hero catalog, draft sequence and performance budget");
const { DRAFT_SEQUENCE: turns, ENABLED_FEARLESS_DRAFT_HEROES: enabledHeroes,
  DRAFT_HERO_ACTION_BUDGET_MS: budgetMs } = await import(
  `data:text/javascript;base64,${Buffer.from(modelCode).toString("base64")}`,
);
const heroIds = enabledHeroes.map((hero) => hero.id).slice(0, turns.length);
assert.equal(heroIds.length, turns.length, "Enough enabled heroes to complete the real draft sequence");
const serverLogs = [];
const runtime = createDraftPerformanceRuntime({ runId, databasePort, sitePort, logs: serverLogs });
const { docker, databaseName: containerName } = runtime;
const samples = [];
let server;
let db;
let failure;
let activeStreams = [];
let cleanupPromise;

async function assertPortAvailable(port) {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => listener.close(resolve));
}

async function waitUntil(check, description, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(10);
  }
  throw new Error(`Timeout: ${description}`);
}

async function prepareDatabase() {
  await runtime.prepare();
  const existing = await docker(["ps", "-a", "--filter", `name=^/${containerName}$`, "--format", "{{.Names}}"]);
  assert.equal(existing.stdout.trim(), "", "A previous benchmark container exists; refusing to replace it");
  await docker(["run", "--detach", "--rm", "--name", containerName,
    "--label", `dotaleague.draft-perf-run=${runId}`,
    ...runtime.databaseNetworkArguments,
    ...runtime.databaseResourceArguments,
    "--publish", `127.0.0.1:${runtime.databasePublishPort}:5432`,
    "--env", `POSTGRES_USER=${databaseUser}`, "--env", `POSTGRES_PASSWORD=${databasePassword}`,
    "--env", "POSTGRES_DB=draftperf", "postgres:15-alpine"]);
  runtime.noteDatabaseCreated();
  await waitUntil(async () => {
    try {
      const result = await docker(["exec", containerName, "pg_isready", "-h", "127.0.0.1",
        "-U", databaseUser, "-d", "draftperf"]);
      return result.stdout.includes("accepting connections");
    } catch { return false; }
  }, "isolated PostgreSQL startup", 30_000);
  await runtime.openTunnel();
  db = new pg.Client({ host: "127.0.0.1", port: databasePort, user: databaseUser,
    password: databasePassword, database: "draftperf" });
  await db.connect();
  await db.query(readFileSync(new URL("tests/fixtures/draft-performance.sql", root), "utf8"));
  for (const name of ["0061_fearless_draft.sql", "0062_fearless_draft_agreements.sql",
    "0068_fearless_draft_preview.sql", "0070_fearless_draft_bot_and_toss_segments.sql",
    "0097_fearless_draft_lobby_preview.sql", "0098_fearless_draft_hero_suggestions.sql",
    "0140_fearless_draft_lineup_assignments.sql", "0141_fearless_draft_season_lobby_preview.sql",
    "0150_fearless_draft_reliability.sql", "0176_bot3_captain_voting_and_timing.sql",
    "0188_fearless_draft_context_presence.sql", "0189_fearless_training_inactivity.sql"]) {
    if (name.startsWith("0188")) {
      await db.query("ALTER TABLE draft_series ADD COLUMN season_match_id bigint REFERENCES season_matches(id)");
    }
    await db.query(readFileSync(new URL(name, migrations), "utf8"));
  }
  for (const [index, player] of players.entries()) {
    await db.query("INSERT INTO players(discord_id,steam_id32,ingame_name) VALUES ($1,$2,$3)",
      [player.id, 100001 + index, `Performance player ${index + 1}`]);
    await db.query(`INSERT INTO web_sessions(token_hash,discord_id,discord_username,expires_at)
      VALUES ($1,$2,$3,NOW()+INTERVAL '1 hour')`,
    [createHash("sha256").update(player.token).digest("hex"), player.id, `perf${index + 1}`]);
  }
}

async function startServer() {
  if (runtime.usesContainers) {
    await runtime.startSite({ databaseUser, databasePassword });
    await waitUntil(async () => {
      try { return (await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) })).ok; }
      catch { return false; }
    }, "isolated image startup", 30_000);
    return;
  }
  const standalone = new URL(".next/standalone/server.js", root);
  assert.ok(existsSync(standalone), "Run the required production build before this benchmark");
  server = spawn(process.execPath, [fileURLToPath(standalone)], {
    cwd: fileURLToPath(root), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", PORT: String(sitePort), HOSTNAME: "127.0.0.1", PUBLIC_BASE_URL: baseUrl,
      DATABASE_URL: `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${databasePort}/draftperf`,
      POSTGRES_HOST: "127.0.0.1", POSTGRES_PORT: String(databasePort), POSTGRES_USER: databaseUser,
      POSTGRES_PASSWORD: databasePassword, POSTGRES_DB: "draftperf", DATABASE_POOL_SIZE: "10" },
  });
  for (const pipe of [server.stdout, server.stderr]) {
    pipe.on("data", (chunk) => serverLogs.push(chunk.toString()));
  }
  server.on("error", (error) => serverLogs.push(error.message));
  await waitUntil(async () => {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${serverLogs.join("")}`);
    try { return (await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) })).ok; }
    catch { return false; }
  }, "isolated production server startup", 30_000);
}

async function seedSeries(id, cohort) {
  await db.query("INSERT INTO season_matches(id) VALUES ($1)", [id]);
  await db.query(`INSERT INTO season_match_rooms(match_id,team_a_captain_id,team_b_captain_id)
    VALUES ($1,$2,$3)`, [id, cohort[0].id, cohort[5].id]);
  for (const [index, player] of cohort.entries()) {
    await db.query(`INSERT INTO season_match_room_players(match_id,player_id,team_side,slot_number)
      VALUES ($1,$2,$3,$4)`, [id, player.id, index < 5 ? "a" : "b", index % 5 + 1]);
    await db.query("INSERT INTO season_match_room_presence(match_id,player_id) VALUES ($1,$2)", [id, player.id]);
  }
  await db.query(`INSERT INTO draft_series(id,player1_id,player2_id,format,status,
      map1_coin_toss_winner_id,season_match_id)
    VALUES ($1,$2,$3,'BO3','DRAFTING',$2,$1)`, [id, cohort[0].id, cohort[5].id]);
  await db.query(`INSERT INTO draft_maps(id,series_id,map_number,status,first_chooser_id,
      first_choice,second_choice,radiant_player_id,first_pick_player_id,step_started_at)
    VALUES ($1,$1,1,'DRAFTING',$2,'FIRST','RADIANT',$3,$2,NOW())`,
  [id, cohort[0].id, cohort[5].id]);
}

function openStream(player, matchId) {
  const controller = new AbortController();
  const stream = { controller, latestVersion: -1, snapshot: null, errors: [], finished: null };
  stream.finished = (async () => {
    try {
      const response = await fetch(`${baseUrl}/api/fearless-draft/events?seasonMatchId=${matchId}`, {
        headers: { cookie: `ls_session=${player.token}` }, signal: controller.signal,
      });
      assert.equal(response.status, 200, `SSE player ${player.id}`);
      assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
      let buffer = "";
      const decoder = new TextDecoder();
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true }).replaceAll("\r\n", "\n");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = event.split("\n").filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6)).join("\n");
          if (event.includes("event: server-error")) stream.errors.push(data);
          if (event.includes("event: snapshot") && data) {
            const snapshot = JSON.parse(data);
            if (snapshot.series?.map?.version >= stream.latestVersion) {
              stream.snapshot = snapshot;
              stream.latestVersion = snapshot.series.map.version;
            }
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) stream.errors.push(error.message);
    }
  })();
  return stream;
}

async function closeStreams(streams = activeStreams) {
  const previous = [...streams];
  activeStreams = activeStreams.filter((stream) => !previous.includes(stream));
  previous.forEach((stream) => stream.controller.abort());
  await Promise.all(previous.map((stream) => stream.finished));
}

async function benchmarkSeries(matchId, phase, cohort = players.slice(0, 10), synchronization = {}) {
  assert.equal(cohort.length, 10, "Ten distinct authenticated participants per match");
  await seedSeries(matchId, cohort);
  const streams = cohort.map((player) => openStream(player, matchId));
  activeStreams.push(...streams);
  await waitUntil(() => streams.every((stream) => stream.latestVersion === 0), "all ten live snapshots");
  await synchronization.ready?.();
  let version = 0;
  for (const [step, turn] of turns.entries()) {
    const player = cohort[turn.actor === "FIRST" ? 0 : 5];
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}/api/fearless-draft?seasonMatchId=${matchId}`, {
      method: "POST", headers: { "content-type": "application/json", cookie: `ls_session=${player.token}`,
        origin: baseUrl, "sec-fetch-site": "same-origin",
        "x-forwarded-for": `192.0.${matchId % 254}.${cohort.indexOf(player) + 1}` },
      body: JSON.stringify({ action: "SELECT_HERO", heroId: heroIds[step], expectedVersion: version,
        seriesId: matchId, mapId: matchId }), signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json();
    const roundTripMs = performance.now() - startedAt;
    assert.equal(response.status, 200, `Step ${step}: ${JSON.stringify(body)}`);
    const receipt = body.heroAction;
    assert.equal(receipt?.action?.step, step, "Real saved step receipt");
    assert.equal(receipt.action.type, turn.type, "Correct ban/pick action");
    assert.equal(receipt.action.heroId, heroIds[step]);
    assert.equal(receipt.map.version, version + 1);
    assert.equal(receipt.map.currentStep, step + 1);
    const timing = /(?:^|,\s*)draft;dur=([\d.]+)/.exec(response.headers.get("server-timing") ?? "");
    assert.ok(timing, "Every ban and pick must report its real handler duration");
    const sample = { phase, matchId, step, type: turn.type,
      serverMs: Number(timing[1]), roundTripMs: Math.round(roundTripMs * 100) / 100 };
    samples.push(sample);
    version = receipt.map.version;
    await waitUntil(() => streams.every((stream) => stream.latestVersion >= version),
      `saved step ${step} reaches all ten players`, 10_000);
    sample.allClientsMs = Math.round((performance.now() - startedAt) * 100) / 100;
    for (const stream of streams) assert.deepEqual(stream.errors, [], "No live update errors");
  }
  const count = await db.query("SELECT COUNT(*)::int AS count FROM draft_actions WHERE map_id=$1", [matchId]);
  assert.equal(count.rows[0].count, 24, "Exactly one saved action per draft step");
  assert.equal(streams[0].snapshot.series.map.status, "FINAL_PICK_REVIEW");
  await synchronization.finished?.();
  await closeStreams(streams);
}

function barrier(participants) {
  let arrived = 0;
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  return () => {
    if (++arrived === participants) release();
    return ready;
  };
}

function statistics(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (p) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? null;
  return { count: sorted.length, p50: percentile(0.5), p95: percentile(0.95), max: sorted.at(-1) ?? null };
}

async function releaseResources() {
  const results = await Promise.allSettled([
    closeStreams(),
    (async () => {
      if (server && server.exitCode === null) {
        server.kill();
        await Promise.race([new Promise((resolve) => server.once("exit", resolve)),
          delay(5_000, undefined, { ref: false })]);
        if (server.exitCode === null) server.kill("SIGKILL");
      }
    })(),
    (async () => { if (db) await db.end(); })(),
  ]);
  await runtime.cleanUp();
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected) throw rejected.reason;
}

function cleanUp() {
  cleanupPromise ??= releaseResources();
  return cleanupPromise;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void cleanUp().then(() => process.exit(130), (error) => {
      console.error(error);
      process.exit(1);
    });
  });
}

async function runBenchmark() {
  await startServer();
  await benchmarkSeries(9001, "cold");
  await benchmarkSeries(9002, "warmup");
  for (let run = 1; run <= 3; run += 1) {
    for (let series = 1; series <= 2; series += 1) {
      await benchmarkSeries(9100 + run * 10 + series, `measured-${run}`);
    }
  }
  const synchronization = { ready: barrier(2), finished: barrier(2) };
  await Promise.all([
    benchmarkSeries(9201, "concurrent", players.slice(0, 10), synchronization),
    benchmarkSeries(9202, "concurrent", players.slice(10), synchronization),
  ]);
  const measured = samples.filter((sample) => sample.phase.startsWith("measured-"));
  const cold = samples.filter((sample) => sample.phase === "cold");
  const concurrent = samples.filter((sample) => sample.phase === "concurrent");
  const overBudget = samples.filter((sample) => sample.phase !== "warmup" && sample.serverMs > budgetMs);
  const report = { environment: runtime.description,
    budgetMs, firstColdAction: cold[0],
    coldServerMs: statistics(cold.map((sample) => sample.serverMs)),
    warmupServerMs: statistics(samples.filter((sample) => sample.phase === "warmup").map((sample) => sample.serverMs)),
    measuredServerMs: statistics(measured.map((sample) => sample.serverMs)),
    measuredRoundTripMs: statistics(measured.map((sample) => sample.roundTripMs)),
    measuredAllClientsMs: statistics(measured.map((sample) => sample.allClientsMs)),
    concurrentServerMs: statistics(concurrent.map((sample) => sample.serverMs)),
    concurrentRoundTripMs: statistics(concurrent.map((sample) => sample.roundTripMs)),
    concurrentAllClientsMs: statistics(concurrent.map((sample) => sample.allClientsMs)),
    overBudget, samples };
  mkdirSync(output, { recursive: true });
  writeFileSync(new URL("report.json", output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, samples: undefined }, null, 2));
  assert.deepEqual(overBudget, [], `Cold and measured server bans/picks must all finish within ${budgetMs} ms`);
}

try {
  await assertPortAvailable(databasePort);
  await assertPortAvailable(sitePort);
  await prepareDatabase();
  if (process.argv.includes("--schema-only")) {
    console.log("Isolated PostgreSQL fixture and project migrations verified; twenty authenticated test players created");
  } else {
    await runBenchmark();
  }
} catch (error) {
  failure = error;
  mkdirSync(output, { recursive: true });
  writeFileSync(new URL("failure.json", output), JSON.stringify({ error: error.message, samples }, null, 2));
} finally {
  mkdirSync(output, { recursive: true });
  try { await runtime.collectSiteLogs(); } catch (error) { serverLogs.push(error.message); }
  writeFileSync(new URL("server.log", output), serverLogs.join(""));
  try { await cleanUp(); } catch (error) { failure ??= error; }
}
if (failure) {
  console.error(failure);
  process.exitCode = 1;
}
