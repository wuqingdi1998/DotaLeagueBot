import { getSession } from "@/lib/auth";
import { loadTestDocument, TEST_DOCUMENT_HEADERS } from "./server/test-document";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user?.isAdmin) return new Response("Страница не найдена", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const origin = new URL(process.env.PUBLIC_BASE_URL ?? request.url).origin;
  return new Response(await loadTestDocument(origin), { headers: TEST_DOCUMENT_HEADERS });
}
