export class SeasonLobbyRoomError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function seasonLobbyRoomErrorResponse(error: unknown): Response | null {
  if (error instanceof SeasonLobbyRoomError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}
