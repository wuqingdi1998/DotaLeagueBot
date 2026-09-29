import {
  changeOrganizerPassword,
  responseFromAuthError,
} from "@/lib/auth";

type PasswordChangeBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as PasswordChangeBody | null;
    if (
      typeof body?.currentPassword !== "string" ||
      typeof body.newPassword !== "string"
    ) {
      return Response.json(
        { error: "Введите текущий и новый пароль" },
        { status: 400 },
      );
    }
    await changeOrganizerPassword(body.currentPassword, body.newPassword);
    return Response.json({ ok: true });
  } catch (error) {
    const response = responseFromAuthError(error);
    return Response.json(
      { error: await response.text() },
      { status: response.status },
    );
  }
}
