import { secretMatches } from "./security";

export function compendiumInternalAuthError(request: Request): Response | null {
  const expected = (
    process.env.COMPENDIUM_SCHEDULER_SECRET ??
    process.env.DISCORD_TOKEN ??
    ""
  ).trim();
  const authorization = request.headers.get("authorization") ?? "";
  const candidate = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (expected.length < 24) {
    return Response.json(
      { error: "Внутренние команды компендиума не настроены" },
      { status: 503 },
    );
  }
  if (!candidate || !secretMatches(candidate, expected)) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }
  return null;
}
