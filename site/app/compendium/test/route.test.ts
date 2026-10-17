import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), document: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: mocks.session }));
vi.mock("./server/test-document", () => ({ loadTestDocument: mocks.document, TEST_DOCUMENT_HEADERS: { "Content-Type": "text/html", "Cache-Control": "private, no-store" } }));
import { GET } from "./route";

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("PUBLIC_BASE_URL", "https://example.test"); });
it("does not build or disclose the test document to participants or anonymous visitors", async () => {
  for (const user of [null, { isAdmin: false }]) {
    mocks.session.mockResolvedValue(user);
    expect((await GET(new Request("https://example.test/compendium/test"))).status).toBe(404);
    expect(mocks.document).not.toHaveBeenCalled();
  }
});
it("opens an organizer-only document without loading live compendium data", async () => {
  mocks.session.mockResolvedValue({ isAdmin: true }); mocks.document.mockResolvedValue("<html>test only</html>");
  const result = await GET(new Request("https://example.test/compendium/test"));
  expect(result.status).toBe(200); expect(await result.text()).toBe("<html>test only</html>");
  expect(mocks.document).toHaveBeenCalledWith("https://example.test");
});
