import { NextRequest, NextResponse } from "next/server";
import { organizerSessionCookie, playerSessionCookie } from "@/lib/auth-session";
import { hasOrganizerAccess } from "@/lib/site-break";
import { isDevelopmentSite } from "./environment";

const publicPaths = new Set([
  "/development/login",
  "/api/auth/organizer",
  "/api/auth/logout",
  "/api/health",
  "/api/version",
]);

/** The private data copy must remain inaccessible when session checks fail. */
export async function developmentAccessResponse(request: NextRequest) {
  if (!isDevelopmentSite() || publicPaths.has(request.nextUrl.pathname)) return null;
  try {
    const hasAccess = await hasOrganizerAccess({
      playerSessionToken: request.cookies.get(playerSessionCookie)?.value ?? null,
      organizerSessionToken: request.cookies.get(organizerSessionCookie)?.value ?? null,
    });
    if (hasAccess) return null;
  } catch {
    return NextResponse.json({ error: "Тестовый сайт временно недоступен" }, { status: 503 });
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Войдите на тестовый сайт по паролю организатора" }, { status: 401 });
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/development/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
