export function isCompendiumPath(pathname: string): boolean {
  return /^\/compendium(?:\/|$)/.test(pathname)
    || /^\/organizer\/compendium(?:-october)?(?:\/|$)/.test(pathname)
    || /^\/api\/compendium(?:\/|$)/.test(pathname)
    || /^\/api\/(?:admin|internal)\/compendium(?:[-/]|$)/.test(pathname);
}
