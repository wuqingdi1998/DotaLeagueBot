import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { publishLiveUpdate, subscribeToLiveUpdates } from "./live-update-events";

afterEach(() => vi.restoreAllMocks());

it("does not turn a saved action into failure when a disconnected listener throws", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const receive = vi.fn();
  const stopBroken = subscribeToLiveUpdates("test", () => { throw new Error("Closed stream"); });
  const stopHealthy = subscribeToLiveUpdates("test", receive);
  expect(() => publishLiveUpdate("test")).not.toThrow();
  expect(receive).toHaveBeenCalledOnce();
  expect(log).toHaveBeenCalledOnce();
  stopBroken();
  stopHealthy();
});
