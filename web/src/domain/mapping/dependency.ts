import { DiscoveredFeature } from '../../types';

export interface DependencyNode {
  featureId: string;
  featureName: string;
  status: string;
  dependsOn: string[];
  requiredBy: string[];
  isBlocked: boolean;
  blockingReason?: string;
}

export interface DependencyGraphAnalysis {
  nodes: DependencyNode[];
  hasCircularDependency: boolean;
  blockedCount: number;
  readyToIntegrateOrder: string[];
}

export class FeatureDependencyGraphResolver {
  resolveGraph(features: DiscoveredFeature[]): DependencyGraphAnalysis {
    const featureMap = new Map<string, DiscoveredFeature>();
    features.forEach((f) => featureMap.set(f.id, f));

    const nodes: DependencyNode[] = [];
    const requiredByMap = new Map<string, string[]>();

    // Index reverse dependencies
    features.forEach((f) => {
      f.dependencies.forEach((depId) => {
        const existing = requiredByMap.get(depId) || [];
        existing.push(f.id);
        requiredByMap.set(depId, existing);
      });
    });

    let blockedCount = 0;

    features.forEach((f) => {
      const dependsOn = f.dependencies;
      const requiredBy = requiredByMap.get(f.id) || [];

      // Check if any prerequisite is not fully integrated or native ready
      let isBlocked = false;
      let blockingReason = '';

      for (const depId of dependsOn) {
        const depFeature = featureMap.get(depId);
        if (!depFeature) {
          isBlocked = true;
          blockingReason = `Missing prerequisite feature '${depId}'`;
          break;
        } else if (
          depFeature.implementationStatus !== 'FULLY_INTEGRATED' &&
          depFeature.implementationStatus !== 'NATIVE_READY'
        ) {
          isBlocked = true;
          blockingReason = `Waiting for dependency '${depFeature.name}' to complete integration`;
          break;
        }
      }

      if (isBlocked) {
        blockedCount++;
      }

      nodes.push({
        featureId: f.id,
        featureName: f.name,
        status: f.implementationStatus,
        dependsOn,
        requiredBy,
        isBlocked,
        blockingReason: isBlocked ? blockingReason : undefined
      });
    });

    // Topological sort for recommended integration sequence
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const feat = featureMap.get(id);
      if (feat) {
        feat.dependencies.forEach((dep) => visit(dep));
      }
      order.push(id);
    };

    features.forEach((f) => visit(f.id));

    return {
      nodes,
      hasCircularDependency: false,
      blockedCount,
      readyToIntegrateOrder: order
    };
  }
}
