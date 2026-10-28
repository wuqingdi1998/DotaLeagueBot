import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), load: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.admin,
  responseFromAuthError: (error: unknown) => { if (error instanceof Response) return error; throw error; },
}));
vi.mock("@/app/organizer/cup/services/cup-repository", () => ({ loadCupConstructor: mocks.load, saveCupConstructor: mocks.save }));
import { GET, PUT } from "./route";

beforeEach(() => { vi.resetAllMocks(); });

it.each([401, 403])("blocks reads and writes without organizer rights (%s)", async (status) => {
  mocks.admin.mockRejectedValue(new Response("Нет доступа", { status }));
  expect((await GET()).status).toBe(status);
  expect((await PUT(new Request("https://example.test", { method: "PUT", body: "{}" }))).status).toBe(status);
  expect(mocks.load).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("allows an organizer, avoids caching and returns save conflicts", async () => {
  mocks.admin.mockResolvedValue({ isAdmin: true, isStandaloneOrganizer: true });
  mocks.load.mockResolvedValue({ revision: 0 });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  mocks.save.mockRejectedValue(new Response("Другая вкладка", { status: 409 }));
  expect((await PUT(new Request("https://example.test", { method: "PUT", body: '{"board":{},"revision":1}' }))).status).toBe(409);
  expect((await PUT(new Request("https://example.test", { method: "PUT", body: "invalid" }))).status).toBe(400);
});
