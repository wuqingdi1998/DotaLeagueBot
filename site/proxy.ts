import { NextRequest, NextResponse } from "next/server";
import { inspectApiRequest } from "@/lib/request-security";
import {
  organizerSessionCookie,
  playerSessionCookie,
} from "@/lib/auth-session";
import { isSiteBreakBypassPath } from "@/lib/site-break-paths";
import { decideSiteBreakAccess } from "@/lib/site-break-policy";
import { hasOrganizerSession, isSiteBreakEnabled } from "@/lib/site-break";

function clientAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    const contentLengthHeader = request.headers.get("content-length");
    const parsedContentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : null;
    const rejection = inspectApiRequest({
      method: request.method,
      pathname,
      origin: request.headers.get("origin"),
      expectedOrigin:
        process.env.PUBLIC_BASE_URL?.trim() || request.nextUrl.origin,
      fetchSite: request.headers.get("sec-fetch-site"),
      contentLength:
        parsedContentLength !== null && Number.isFinite(parsedContentLength)
          ? parsedContentLength
          : null,
      clientAddress: clientAddress(request),
    });
    if (rejection) {
      const response = NextResponse.json(
        { error: rejection.message },
        { status: rejection.status },
      );
      if (rejection.retryAfterSeconds) {
        response.headers.set(
          "Retry-After",
          String(rejection.retryAfterSeconds),
        );
      }
      return response;
    }
  }
  if (isSiteBreakBypassPath(pathname)) return NextResponse.next();

  let breakEnabled: boolean;
  try {
    breakEnabled = await isSiteBreakEnabled();
  } catch {
    return NextResponse.next();
  }
  if (!breakEnabled) return NextResponse.next();

  let hasOrganizerAccess = false;
  try {
    hasOrganizerAccess = await hasOrganizerSession({
      playerSessionToken: request.cookies.get(playerSessionCookie)?.value ?? null,
      organizerSessionToken:
        request.cookies.get(organizerSessionCookie)?.value ?? null,
    });
  } catch {
    // Once a break is known to be active, an uncertain session stays blocked.
  }

  const decision = decideSiteBreakAccess({
    isBreakEnabled: breakEnabled,
    hasOrganizerAccess,
    isApiRequest: pathname.startsWith("/api/"),
  });
  if (decision === "allow") return NextResponse.next();
  if (decision === "block-api") {
    return NextResponse.json(
      { error: "Сайт временно находится на перерыве" },
      { status: 503 },
    );
  }
  const breakUrl = request.nextUrl.clone();
  breakUrl.pathname = "/break";
  breakUrl.search = "";
  return NextResponse.rewrite(breakUrl);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$).*)",
  ],
};
