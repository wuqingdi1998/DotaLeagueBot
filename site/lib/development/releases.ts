export type ReleaseChange = {
  revision: string;
  title: string;
  createdAt: string;
};

export type ReleaseManifest = {
  revision: string;
  baselineRevision: string;
  changes: ReleaseChange[];
};

export type ReleaseComparison = {
  developmentRevision: string;
  productionRevision: string | null;
  status: "equal" | "ahead" | "unavailable";
  changes: ReleaseChange[];
};

/** Only a known ancestor can establish which changes are still unpublished. */
export function compareReleases(
  manifest: ReleaseManifest,
  productionRevision: string | null,
): ReleaseComparison {
  const result = {
    developmentRevision: manifest.revision,
    productionRevision,
  };
  if (productionRevision === manifest.revision) {
    return { ...result, status: "equal", changes: [] };
  }
  const publishedIndex = manifest.changes.findIndex(
    (change) => change.revision === productionRevision,
  );
  if (productionRevision === manifest.baselineRevision || publishedIndex >= 0) {
    const changes = publishedIndex >= 0
      ? manifest.changes.slice(0, publishedIndex)
      : manifest.changes;
    return { ...result, status: "ahead", changes };
  }
  return { ...result, status: "unavailable", changes: [] };
}
