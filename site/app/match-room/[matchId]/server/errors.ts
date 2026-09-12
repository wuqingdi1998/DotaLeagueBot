export class MatchRoomError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function matchRoomErrorResponse(error: unknown): Response | null {
  return error instanceof MatchRoomError
    ? Response.json({ error: error.message }, { status: error.status })
    : null;
}
