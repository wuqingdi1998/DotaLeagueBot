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
