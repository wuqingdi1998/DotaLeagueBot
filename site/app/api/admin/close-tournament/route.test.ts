import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.requireAdmin,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return error;
    throw error;
  },
}));
vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));

import { PATCH } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://example.test/api/admin/close-tournament", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("close tournament settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue({ discordId: "100" });
    mocks.transaction.mockResolvedValue(undefined);
  });

  it("accepts a standard BO1 close", async () => {
    const response = await PATCH(request({
      tournamentId: 10,
      format: "CM",
      bestOf: 1,
    }));
    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("rejects Fearless Draft BO1", async () => {
    const response = await PATCH(request({
      tournamentId: 10,
      format: "Fearless Draft",
      bestOf: 1,
    }));
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
