import { fetchSiteRequest } from "./site-request";

export async function logoutAndReload(): Promise<void> {
  const response = await fetchSiteRequest("/api/auth/logout", { method: "POST" });
  if (!response.ok) {
    const result = await response.json() as { error: string };
    window.alert(result.error);
    return;
  }
  window.location.reload();
}
