import { requireSession, responseFromAuthError } from "@/lib/auth";
import { loadCompendium } from "@/app/compendium/services/compendium";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSession();
    return Response.json(await loadCompendium(user));
  } catch (error) {
    return responseFromAuthError(error);
  }
}
