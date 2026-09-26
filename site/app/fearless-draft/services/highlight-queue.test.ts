import { describe, expect, it, vi } from "vitest";
import { createDraftHighlightQueue } from "./highlight-queue";

describe("Fearless Draft highlight queue", () => {
  it("keeps only the newest highlight while another highlight is in flight", async () => {
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
    const third = queue(3, execute);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledWith(1));
    await expect(second).resolves.toBe(false);
    expect(execute).not.toHaveBeenCalledWith(2);

    releaseFirst?.();
    await expect(first).resolves.toBe(true);
    await expect(third).resolves.toBe(true);
    expect(execute.mock.calls.map(([heroId]) => heroId)).toEqual([1, 3]);
  });
});
