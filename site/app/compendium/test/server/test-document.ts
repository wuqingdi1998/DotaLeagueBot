import { readFile } from "node:fs/promises";
import path from "node:path";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** The child has an opaque origin, no cookies/storage access, no parent access and no network writes. */
export function renderTestDocument(frame: string, assetOrigin: string): string {
  const source = frame.replaceAll("__TEST_ASSET_ORIGIN__", new URL(assetOrigin).origin);
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Компендиум · Предпросмотр (тест)</title><style>html,body{margin:0;background:#07151f;color:#eef8ff}iframe{display:block;width:100%;height:100dvh;border:0}.test-return{position:absolute;z-index:5;right:12px;top:20px;padding:8px;border:1px solid #426173;border-radius:8px;color:#eef8ff;background:#102936;text-decoration:none;font:14px sans-serif}</style><a class="test-return" href="/compendium" aria-label="Вернуться в основу" title="Вернуться в основу">↩</a><iframe title="Независимый тестовый компендиум" sandbox="allow-scripts" credentialless referrerpolicy="no-referrer" srcdoc="${escapeHtml(source)}"></iframe></html>`;
}

export async function loadTestDocument(assetOrigin: string): Promise<string> {
  const frame = await readFile(path.join(process.cwd(), ".data/compendium-test/frame.html"), "utf8");
  return renderTestDocument(frame, assetOrigin);
}

export const TEST_DOCUMENT_HEADERS = {
  "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self' about:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; img-src 'self' data:; font-src data:",
} as const;
