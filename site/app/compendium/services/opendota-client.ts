const OPEN_DOTA_API_ORIGIN = "https://api.opendota.com";

export function openDotaApiUrl(path: string): URL {
  const url = new URL(path, OPEN_DOTA_API_ORIGIN);
  const apiKey = process.env.OPENDOTA_API_KEY?.trim();
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url;
}
