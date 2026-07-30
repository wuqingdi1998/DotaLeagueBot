import { NextRequest, NextResponse } from "next/server";
import { inspectApiRequest } from "@/lib/request-security";

function clientAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function proxy(request: NextRequest) {
  const contentLengthHeader = request.headers.get("content-length");
  const parsedContentLength = contentLengthHeader
    ? Number(contentLengthHeader)
    : null;
  const rejection = inspectApiRequest({
    method: request.method,
    pathname: request.nextUrl.pathname,
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
  if (!rejection) return NextResponse.next();

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

export const config = {
  matcher: "/api/:path*",
};
