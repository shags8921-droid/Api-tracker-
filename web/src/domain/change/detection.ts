import { DiscoveredFeature, ChangeDetectionDiff, ManifestVersion } from '../../types';

export class ChangeDetectionEngine {
  compareSnapshots(
    previousFeatures: DiscoveredFeature[],
    currentFeatures: DiscoveredFeature[],
    previousVersion: string | null = 'v2.3.0',
    currentVersion: string = 'v2.4.0'
  ): ChangeDetectionDiff {
    const prevMap = new Map<string, DiscoveredFeature>();
    previousFeatures.forEach((f) => prevMap.set(f.id, f));

    const currMap = new Map<string, DiscoveredFeature>();
    currentFeatures.forEach((f) => currMap.set(f.id, f));

    const addedFeatures: DiscoveredFeature[] = [];
    const removedFeatures: DiscoveredFeature[] = [];
    const modifiedFeatures: Array<{ feature: DiscoveredFeature; changes: string[] }> = [];

    // Find added & modified
    currentFeatures.forEach((curr) => {
      const prev = prevMap.get(curr.id);
      if (!prev) {
        addedFeatures.push(curr);
      } else {
        const changes: string[] = [];
        if (curr.route !== prev.route) {
          changes.push(`Route changed from '${prev.route}' to '${curr.route}'`);
        }
        if (curr.apiOperations.length !== prev.apiOperations.length) {
          changes.push(`API operations count changed (${prev.apiOperations.length} -> ${curr.apiOperations.length})`);
        }
        if (curr.permissions.join(',') !== prev.permissions.join(',')) {
          changes.push(`Required permissions modified`);
        }
        if (curr.assets.length !== prev.assets.length) {
          changes.push(`Associated assets updated`);
        }
        if (changes.length > 0) {
          modifiedFeatures.push({ feature: curr, changes });
        }
      }
    });

    // Find removed
    previousFeatures.forEach((prev) => {
      if (!currMap.has(prev.id)) {
        removedFeatures.push(prev);
      }
    });

    const hasBreakingChanges =
      removedFeatures.length > 0 ||
      modifiedFeatures.some((m) => m.changes.some((c) => c.includes('Route') || c.includes('permissions')));

    return {
      previousVersion,
      currentVersion,
      addedFeatures,
      removedFeatures,
      modifiedFeatures,
      hasBreakingChanges
    };
  }

  createVersionSnapshot(
    websiteId: string,
    version: string,
    features: DiscoveredFeature[],
    pagesCount: number
  ): ManifestVersion {
    return {
      versionId: `ver_${Date.now()}`,
      websiteId,
      version,
      timestamp: Date.now(),
      featuresCount: features.length,
      pagesCount,
      rawJson: JSON.stringify(features),
      isCurrent: true
    };
  }
}
