import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { createConnection } from "node:net";

const execute = promisify(execFile);
const ownershipLabel = "dotaleague.draft-perf-run";
const quotePosix = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;

export const draftPerformanceHelp = `Draft performance benchmark
  node scripts/check-draft-performance.mjs
  node scripts/check-draft-performance.mjs --schema-only
  node scripts/check-draft-performance.mjs --image=IMAGE_ID
  node scripts/check-draft-performance.mjs --remote-host=HOST --remote-user=USER --ssh-key=PATH --image=IMAGE_ID

Optional environment: DRAFT_PERF_IMAGE, DRAFT_PERF_SSH_HOST, DRAFT_PERF_SSH_USER,
DRAFT_PERF_SSH_KEY, DRAFT_PERF_SSH_PORT, DRAFT_PERF_REMOTE_DB_PORT, DRAFT_PERF_REMOTE_SITE_PORT.
Remote mode runs isolated labelled containers and a private network. It never mounts
host files, uses the production database, or restarts existing services.
--remote-db-port=PORT and --remote-site-port=PORT default to 55438 and 3024 on loopback.
Local mode without --image uses the existing production build and an isolated local database.`;

function optionsFromArguments() {
  const options = {};
  const allowed = new Set(["image", "remote-host", "remote-user", "ssh-key", "ssh-port",
    "remote-db-port", "remote-site-port"]);
  for (const argument of process.argv.slice(2)) {
    if (["--", "--schema-only", "--help"].includes(argument)) continue;
    const match = /^--([^=]+)=(.+)$/.exec(argument);
    assert.ok(match && allowed.has(match[1]), `Unknown benchmark option: ${argument}`);
    options[match[1]] = match[2];
  }
  const from = (argument, environment, fallback = "") =>
    options[argument] ?? process.env[environment] ?? fallback;
  const port = (argument, environment, fallback) => {
    const value = Number(from(argument, environment, String(fallback)));
    assert.ok(Number.isInteger(value) && value > 0 && value <= 65535, `Invalid ${argument}`);
    return value;
  };
  const remoteHost = from("remote-host", "DRAFT_PERF_SSH_HOST");
  const remoteUser = from("remote-user", "DRAFT_PERF_SSH_USER");
  const image = from("image", "DRAFT_PERF_IMAGE");
  assert.ok(!remoteHost || /^[A-Za-z0-9][A-Za-z0-9.:-]*$/.test(remoteHost), "Invalid remote host");
  assert.ok(!remoteUser || /^[A-Za-z_][A-Za-z0-9_-]*$/.test(remoteUser), "Invalid remote user");
  assert.ok(!image || (!image.startsWith("-") && !/\s/.test(image)), "Invalid image identifier");
  assert.ok(!remoteHost || image, "Remote mode requires an explicit isolated site image");
  return { remoteHost, remoteUser, image, sshKey: from("ssh-key", "DRAFT_PERF_SSH_KEY"),
    sshPort: port("ssh-port", "DRAFT_PERF_SSH_PORT", 22),
    remoteDatabasePort: port("remote-db-port", "DRAFT_PERF_REMOTE_DB_PORT", 55438),
    remoteSitePort: port("remote-site-port", "DRAFT_PERF_REMOTE_SITE_PORT", 3024) };
}

export function createDraftPerformanceRuntime({ runId, databasePort, sitePort, logs }) {
  const options = optionsFromArguments();
  const usesContainers = Boolean(options.image);
  const prefix = `dotaleague-draft-perf-${runId.slice(0, 8)}`;
  const databaseName = usesContainers ? `${prefix}-db` : "dotaleague-draft-perf";
  const siteName = `${prefix}-site`;
  const networkName = `${prefix}-network`;
  const created = [];
  let tunnel;
  let imageId;
  const sshTarget = options.remoteUser ? `${options.remoteUser}@${options.remoteHost}` : options.remoteHost;
  const sshBase = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=15",
    "-p", String(options.sshPort), ...(options.sshKey ? ["-i", options.sshKey] : [])];

  async function docker(args) {
    const execOptions = { windowsHide: true, timeout: 120_000, maxBuffer: 2_000_000 };
    if (!options.remoteHost) return execute("docker", args, execOptions);
    return execute("ssh", [...sshBase, sshTarget,
      ["docker", ...args].map(quotePosix).join(" ")], execOptions);
  }

  async function removeOwnedResource(kind, name) {
    const label = kind === "network" ? '{{index .Labels "dotaleague.draft-perf-run"}}'
      : '{{index .Config.Labels "dotaleague.draft-perf-run"}}';
    const identity = await docker(kind === "network"
      ? ["network", "inspect", "--format", label, name] : ["inspect", "--format", label, name]);
    assert.equal(identity.stdout.trim(), runId, `Only remove this run's ${kind}: ${name}`);
    await docker(kind === "network" ? ["network", "rm", name] : ["rm", "--force", "--volumes", name]);
  }

  return {
    docker, databaseName, usesContainers,
    databasePublishPort: options.remoteHost ? options.remoteDatabasePort : databasePort,
    databaseNetworkArguments: usesContainers ? ["--network", networkName] : [],
    databaseResourceArguments: usesContainers ? ["--memory", "128m", "--memory-swap", "128m"] : [],
    noteDatabaseCreated() { created.push(["container", databaseName]); },
    get description() {
      return { mode: options.remoteHost ? "remote-image" : usesContainers ? "local-image" : "local-build",
        host: options.remoteHost || "localhost", siteImageId: imageId ?? null,
        database: "Isolated PostgreSQL 15",
        clients: "Ten live SSE clients per match; two concurrent matches use twenty distinct players" };
    },
    async prepare() {
      if (!usesContainers) return;
      const image = await docker(["image", "inspect", "--format", "{{.Id}}", options.image]);
      imageId = image.stdout.trim();
      assert.match(imageId, /^sha256:[a-f0-9]{64}$/, "Pin the exact site image before creating a test container");
      await docker(["network", "create", "--label", `${ownershipLabel}=${runId}`, networkName]);
      created.push(["network", networkName]);
    },
    async openTunnel() {
      if (!options.remoteHost) return;
      tunnel = spawn("ssh", [...sshBase, "-N", "-T", "-o", "ExitOnForwardFailure=yes",
        "-L", `127.0.0.1:${databasePort}:127.0.0.1:${options.remoteDatabasePort}`,
        "-L", `127.0.0.1:${sitePort}:127.0.0.1:${options.remoteSitePort}`, sshTarget],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      for (const pipe of [tunnel.stdout, tunnel.stderr]) {
        pipe.on("data", (chunk) => logs.push(`[ssh-forward] ${chunk}`));
      }
      let tunnelError;
      tunnel.on("error", (error) => { tunnelError = error; });
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (tunnelError) throw tunnelError;
        assert.equal(tunnel.exitCode, null, "SSH forwarding must remain active");
        const isOpen = await new Promise((resolve) => {
          const socket = createConnection({ host: "127.0.0.1", port: databasePort });
          const finish = (result) => { socket.destroy(); resolve(result); };
          socket.once("connect", () => finish(true));
          socket.once("error", () => finish(false));
          socket.setTimeout(500, () => finish(false));
        });
        if (isOpen) return;
        await delay(100);
      }
      throw new Error("SSH forwarding did not open the isolated database port");
    },
    async startSite({ databaseUser, databasePassword }) {
      assert.ok(usesContainers && imageId, "An exact site image is required for container mode");
      const publishPort = options.remoteHost ? options.remoteSitePort : sitePort;
      await docker(["run", "--detach", "--rm", "--name", siteName,
        "--label", `${ownershipLabel}=${runId}`, "--network", networkName,
        "--memory", "256m", "--memory-swap", "256m",
        "--publish", `127.0.0.1:${publishPort}:3000`,
        "--env", `DATABASE_URL=postgresql://${databaseUser}:${databasePassword}@${databaseName}:5432/draftperf`,
        "--env", "NODE_ENV=production", "--env", "PORT=3000", "--env", "HOSTNAME=0.0.0.0",
        "--env", `PUBLIC_BASE_URL=http://127.0.0.1:${sitePort}`,
        "--env", "NODE_OPTIONS=--max-old-space-size=128",
        "--env", `POSTGRES_HOST=${databaseName}`, "--env", "POSTGRES_PORT=5432",
        "--env", `POSTGRES_USER=${databaseUser}`, "--env", `POSTGRES_PASSWORD=${databasePassword}`,
        "--env", "POSTGRES_DB=draftperf", "--env", "DATABASE_POOL_SIZE=10", imageId]);
      created.push(["container", siteName]);
    },
    async collectSiteLogs() {
      if (!created.some(([, name]) => name === siteName)) return;
      const result = await docker(["logs", siteName]);
      logs.push(result.stdout, result.stderr);
    },
    async cleanUp() {
      const errors = [];
      for (const [kind, name] of [...created].reverse()) {
        try { await removeOwnedResource(kind, name); } catch (error) { errors.push(error); }
      }
      if (tunnel && tunnel.exitCode === null) {
        tunnel.kill();
        await Promise.race([new Promise((resolve) => tunnel.once("exit", resolve)),
          delay(5_000, undefined, { ref: false })]);
        if (tunnel.exitCode === null) tunnel.kill("SIGKILL");
      }
      if (errors.length) throw new AggregateError(errors, "Isolated benchmark cleanup failed");
    },
  };
}
