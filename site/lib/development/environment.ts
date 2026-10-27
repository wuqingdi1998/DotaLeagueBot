export function isDevelopmentSite(): boolean {
  return process.env.SITE_ENVIRONMENT === "development";
}
