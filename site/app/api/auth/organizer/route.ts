import {
  createOrganizerSession,
  deleteOrganizerSession,
} from "@/lib/auth";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configuredBase = process.env.PUBLIC_BASE_URL;
  if (!origin || !configuredBase) return true;
  try {
    return new URL(origin).origin === new URL(configuredBase).origin;
  } catch {
    return false;
  }
}

async function authErrorResponse(error: unknown) {
  if (error instanceof Response) {
    return Response.json(
      { error: await error.text() },
      { status: error.status },
    );
  }
  throw error;
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: "Запрос отклонён" }, { status: 403 });
    }
    const body = (await request.json()) as { password?: string };
    if (!body.password) {
      return Response.json({ error: "Введите пароль" }, { status: 400 });
    }
    const user = await createOrganizerSession(body.password);
    return Response.json({ ok: true, user });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: "Запрос отклонён" }, { status: 403 });
    }
    await deleteOrganizerSession();
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
