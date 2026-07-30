type ApiRequestDetails = {
  method: string;
  pathname: string;
  origin: string | null;
  expectedOrigin: string;
  fetchSite: string | null;
  contentLength: number | null;
  clientAddress: string;
  now?: number;
};

type RequestRejection = {
  status: 403 | 413 | 429;
  message: string;
  retryAfterSeconds?: number;
};

type RateWindow = {
  count: number;
  expiresAt: number;
};

type RequestPolicy = {
  bucket: string;
  maximumBodyBytes: number;
  maximumRequests: number;
  windowMs: number;
};

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const rateWindows = new Map<string, RateWindow>();
const kibibyte = 1024;
const mebibyte = kibibyte * kibibyte;

function requestPolicy(pathname: string, method: string): RequestPolicy {
  if (safeMethods.has(method)) {
    return {
      bucket: "read",
      maximumBodyBytes: 0,
      maximumRequests: 300,
      windowMs: 60_000,
    };
  }
  if (pathname === "/api/auth/organizer") {
    return {
      bucket: "organizer-login",
      maximumBodyBytes: 8 * kibibyte,
      maximumRequests: 10,
      windowMs: 60_000,
    };
  }
  if (pathname === "/api/applications" && method === "POST") {
    return {
      bucket: "team-registration",
      maximumBodyBytes: 3 * mebibyte,
      maximumRequests: 6,
      windowMs: 60_000,
    };
  }
  if (/^\/api\/players\/[^/]+\/background$/.test(pathname)) {
    return {
      bucket: "profile-background",
      maximumBodyBytes: 52 * mebibyte,
      maximumRequests: 4,
      windowMs: 10 * 60_000,
    };
  }
  return {
    bucket: "mutation",
    maximumBodyBytes: 512 * kibibyte,
    maximumRequests: 90,
    windowMs: 60_000,
  };
}

function hasTrustedOrigin(details: ApiRequestDetails): boolean {
  if (safeMethods.has(details.method)) return true;
  if (details.origin) {
    try {
      return (
        new URL(details.origin).origin ===
        new URL(details.expectedOrigin).origin
      );
    } catch {
      return false;
    }
  }
  return details.fetchSite === "same-origin";
}

function pruneExpiredWindows(now: number) {
  if (rateWindows.size < 1_000) return;
  for (const [key, window] of rateWindows) {
    if (window.expiresAt <= now) rateWindows.delete(key);
  }
  while (rateWindows.size > 10_000) {
    const oldestKey = rateWindows.keys().next().value;
    if (typeof oldestKey !== "string") break;
    rateWindows.delete(oldestKey);
  }
}

export function inspectApiRequest(
  details: ApiRequestDetails,
): RequestRejection | null {
  const method = details.method.toUpperCase();
  const policy = requestPolicy(details.pathname, method);
  const normalized = { ...details, method };
  if (!hasTrustedOrigin(normalized)) {
    return { status: 403, message: "Запрос с постороннего сайта отклонён" };
  }
  if (
    policy.maximumBodyBytes > 0 &&
    details.contentLength !== null &&
    details.contentLength > policy.maximumBodyBytes
  ) {
    return { status: 413, message: "Запрос слишком большой" };
  }

  const now = details.now ?? Date.now();
  pruneExpiredWindows(now);
  const rateKey = [details.clientAddress, policy.bucket].join("|");
  const current = rateWindows.get(rateKey);
  if (!current || current.expiresAt <= now) {
    rateWindows.set(rateKey, { count: 1, expiresAt: now + policy.windowMs });
    return null;
  }
  if (current.count >= policy.maximumRequests) {
    return {
      status: 429,
      message: "Слишком много запросов. Повторите немного позже",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.expiresAt - now) / 1_000),
      ),
    };
  }
  current.count += 1;
  return null;
}

export function resetApiRequestLimitsForTests() {
  rateWindows.clear();
}
