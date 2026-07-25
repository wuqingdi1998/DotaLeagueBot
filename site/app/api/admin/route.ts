import { requireAdmin, responseFromAuthError } from "@/lib/auth";

export async function POST() {
  try {
    return Response.json({ ok: true, user: await requireAdmin() });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
