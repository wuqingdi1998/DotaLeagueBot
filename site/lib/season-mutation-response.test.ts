import { describe, expect, it } from "vitest";
import { readSeasonMutationResponse } from "../app/tournaments/[slug]/services/season-request";

describe("season mutation response", () => {
  it("keeps a plain server validation message visible to the organizer", async () => {
    const result = await readSeasonMutationResponse(
      new Response("Игрок уже добавлен в другой матч этого тура", {
        status: 400,
      }),
    );

    expect(result.error).toBe(
      "Игрок уже добавлен в другой матч этого тура",
    );
  });

  it("reads the normal JSON response", async () => {
    const result = await readSeasonMutationResponse(
      Response.json({ ok: true, id: 185 }),
    );

    expect(result).toEqual({ ok: true, id: 185 });
  });

  it("does not show an HTML error page inside the site", async () => {
    const result = await readSeasonMutationResponse(
      new Response("<html>Internal Server Error</html>", { status: 500 }),
    );

    expect(result.error).toBe("Сервер не смог сохранить изменения");
  });
});
