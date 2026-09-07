import { describe, expect, it, vi } from "vitest";
import { createDraftHighlightQueue } from "./highlight-queue";

describe("Fearless Draft highlight queue", () => {
  it("delivers a newer highlight after an in-flight highlight instead of dropping it", async () => {
    let releaseFirst: (() => void) | undefined;
    const execute = vi.fn(async (heroId: number) => {
      if (heroId === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return true;
    });
    const queue = createDraftHighlightQueue<number>();

    const first = queue(1, execute);
    const second = queue(2, execute);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledWith(1));
    expect(execute).not.toHaveBeenCalledWith(2);

    releaseFirst?.();
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
    expect(execute.mock.calls.map(([heroId]) => heroId)).toEqual([1, 2]);
  });
});
