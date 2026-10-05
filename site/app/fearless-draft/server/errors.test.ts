import { describe, expect, it, vi } from "vitest";
import { draftRouteErrorResponse } from "./errors";

describe("Fearless Draft route errors", () => {
  it("converts a plain authentication response to JSON", async () => {
    const response = await draftRouteErrorResponse(
      new Response("Требуется вход через Discord", { status: 401 }),
      "Действие не выполнено",
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Требуется вход через Discord",
    });
  });

  it("keeps a JSON participation notice readable", async () => {
    const response = await draftRouteErrorResponse(
      Response.json(
        { error: "Снимите статус «Инактив» у @frokeng" },
        { status: 409 },
      ),
      "Действие не выполнено",
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Снимите статус «Инактив» у @frokeng",
    });
  });

  it("returns JSON and logs an unexpected server failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("database unavailable");

    const response = await draftRouteErrorResponse(
      failure,
      "Действие не выполнено",
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Действие не выполнено",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Fearless Draft request failed",
      failure,
    );
    consoleError.mockRestore();
  });
});
