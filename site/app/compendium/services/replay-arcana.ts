import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isArcanaItemId } from "../model/arcana-item-ids";
import {
  loadReplayWearables,
  saveReplayWearables,
  type ReplayWearable,
} from "./replay-arcana-repository";

const execFileAsync = promisify(execFile);

type ReplayParserResult = {
  hasWearableData: boolean;
  wearables: ReplayWearable[];
};

export function replayParserInvocation(
  parserPath: string,
  replayUrl: string,
  platform = process.platform,
): { file: string; arguments: string[] } {
  if (platform === "linux") {
    return {
      file: "/bin/nice",
      arguments: ["-n", "19", parserPath, replayUrl],
    };
  }
  return { file: parserPath, arguments: [replayUrl] };
}

function parseResult(value: unknown): ReplayParserResult {
  if (!value || typeof value !== "object") {
    throw new Error("Replay parser returned an invalid result");
  }
  const result = value as Record<string, unknown>;
  if (result.hasWearableData !== true || !Array.isArray(result.wearables)) {
    throw new Error("Replay did not contain reliable wearable data");
  }
  const wearables = result.wearables.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const wearable = entry as Record<string, unknown>;
    if (
      typeof wearable.accountId !== "string" ||
      typeof wearable.itemId !== "number" ||
      !Number.isSafeInteger(wearable.itemId)
    ) {
      return [];
    }
    return [{ accountId: wearable.accountId, itemId: wearable.itemId }];
  });
  return { hasWearableData: true, wearables };
}

async function extractReplayWearables(replayUrl: string): Promise<ReplayWearable[]> {
  const parserPath = process.env.ARCANA_REPLAY_PARSER_PATH?.trim() ||
    "/usr/local/bin/arcana-replay-parser";
  const invocation = replayParserInvocation(parserPath, replayUrl);
  const { stdout } = await execFileAsync(invocation.file, invocation.arguments, {
    timeout: 210_000,
    maxBuffer: 128 * 1024,
    windowsHide: true,
  });
  return parseResult(JSON.parse(stdout)).wearables;
}

export async function hasPlayerEquippedArcanaInReplay(input: {
  matchId: string;
  replayUrl: string;
  dotaId: string;
}): Promise<boolean> {
  let wearables = await loadReplayWearables(input.matchId);
  if (wearables === null) {
    wearables = await extractReplayWearables(input.replayUrl);
    await saveReplayWearables(input.matchId, wearables);
  }
  return wearables.some(
    (wearable) => wearable.accountId === input.dotaId && isArcanaItemId(wearable.itemId),
  );
}
