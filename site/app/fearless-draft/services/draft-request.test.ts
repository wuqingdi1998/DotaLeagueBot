import { describe, expect, it } from "vitest";
import {
  draftRequestErrorMessage,
  readDraftResponse,
} from "./draft-request";

describe("Fearless Draft response handling", () => {
  it("accepts a normal JSON response", async () => {
    const result = await readDraftResponse<{ ok: boolean }>(
      Response.json({ ok: true }),
      "Действие не выполнено",
    );

    expect(result).toEqual({ ok: true });
  });

  it("replaces an empty successful response with a stable error", async () => {
    await expect(readDraftResponse(
      new Response(null, { status: 200 }),
      "Не удалось обновить драфт",
    )).rejects.toThrow("Не удалось обновить драфт");
  });

  it("allows an empty success for a command already completed by the server", async () => {
    const result = await readDraftResponse(
      new Response(null, { status: 200 }),
      "Действие не выполнено",
      { allowEmptySuccess: true },
    );

    expect(result).toEqual({});
  });

  it("replaces a truncated JSON response with a stable error", async () => {
    await expect(readDraftResponse(
      new Response('{"ok":', { status: 502 }),
      "Действие не выполнено",
    )).rejects.toThrow("Действие не выполнено");
  });

  it("keeps a useful JSON error returned by the server", async () => {
    await expect(readDraftResponse(
      Response.json({ error: "Состояние драфта устарело" }, { status: 409 }),
      "Действие не выполнено",
    )).rejects.toThrow("Состояние драфта устарело");
  });

  it("hides browser network errors from the visitor", () => {
    expect(draftRequestErrorMessage(
      new TypeError("Failed to fetch"),
      "Действие не выполнено",
    )).toBe("Действие не выполнено");
  });

  it("keeps a useful error parsed from the server", () => {
    expect(draftRequestErrorMessage(
      new Error("Состояние драфта устарело"),
      "Действие не выполнено",
    )).toBe("Состояние драфта устарело");
  });
});
