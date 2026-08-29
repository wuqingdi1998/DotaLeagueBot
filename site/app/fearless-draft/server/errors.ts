export class DraftRequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function draftErrorResponse(error: unknown): Response | null {
  if (!(error instanceof DraftRequestError)) return null;
  return Response.json({ error: error.message }, { status: error.status });
}

export async function draftRouteErrorResponse(
  error: unknown,
  fallbackError: string,
): Promise<Response> {
  const requestError = draftErrorResponse(error);
  if (requestError) return requestError;

  if (error instanceof Response) {
    const message = (await error.text().catch(() => "")).trim();
    return Response.json(
      { error: message || fallbackError },
      { status: error.status || 500 },
    );
  }

  console.error("Fearless Draft request failed", error);
  return Response.json({ error: fallbackError }, { status: 500 });
}
