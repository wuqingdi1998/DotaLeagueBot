import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), list: vi.fn(), run: vi.fn(), process: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin, responseFromAuthError: (error: unknown) => error }));
vi.mock("../services/verification-repository", () => ({ listVerificationRequests: mocks.list }));
vi.mock("../services/verification-runner", () => ({ runVerificationAttempt: mocks.run, processDueVerifications: mocks.process }));
import { GET, POST } from "@/app/api/admin/compendium-base/verification-requests/route";
import { POST as internalPost } from "@/app/api/internal/compendium/verification-retries/route";
beforeEach(() => { vi.clearAllMocks(); mocks.admin.mockResolvedValue({ discordId: "1" }); mocks.list.mockResolvedValue([]); mocks.run.mockResolvedValue(true); });
it("restricts organizer queue reads and rechecks to organizers", async () => {
  mocks.admin.mockRejectedValue(Response.json({ error: "Нет доступа" }, { status: 403 }));
  expect((await GET()).status).toBe(403);
  expect((await POST(new Request("https://site.test", { method: "POST", body: JSON.stringify({ id: "1" }) }))).status).toBe(403);
  expect(mocks.run).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
});
it("rechecks a specific saved request and prevents caching its live status", async () => {
  const response = await GET();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect((await POST(new Request("https://site.test", { method: "POST", body: JSON.stringify({ id: "45" }) }))).status).toBe(200);
  expect(mocks.run).toHaveBeenCalledWith("45");
  expect((await POST(new Request("https://site.test", { method: "POST", body: JSON.stringify({ id: "bad" }) }))).status).toBe(400);
});
it("prevents visitors from running the bot's background verification endpoint", async () => {
  vi.stubEnv("COMPENDIUM_SCHEDULER_SECRET", "x".repeat(32));
  try {
    expect((await internalPost(new Request("https://site.test", { method: "POST" }))).status).toBe(401);
    expect(mocks.process).not.toHaveBeenCalled();
  } finally { vi.unstubAllEnvs(); }
});
