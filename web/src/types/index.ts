/**
 * Core Domain Types for SitePulse AI — Phase 3 Advanced Web Architecture
 */

export type FeatureStatus =
  | 'DISCOVERED'
  | 'ANALYSING'
  | 'NATIVE_READY'
  | 'NATIVE_IMPLEMENTED'
  | 'TESTING'
  | 'FULLY_INTEGRATED'
  | 'WEBVIEW_FALLBACK'
  | 'NEEDS_CONFIGURATION'
  | 'UNAVAILABLE'
  | 'FAILED_VALIDATION';

export type ImplementationOption =
  | 'NATIVE_WEB'
  | 'WEBVIEW_FALLBACK'
  | 'REQUIRES_CONFIG'
  | 'UNAVAILABLE';

export type HubType = 'OWNER' | 'MANAGER' | 'GENERAL';

export type AuthType =
  | 'OAUTH2_PKCE'
  | 'BEARER_TOKEN'
  | 'API_KEY'
  | 'BASIC_AUTH';

export type DiscoverySource =
  | 'INTEGRATION_API'
  | 'OPENAPI_SPEC'
  | 'SITEMAP_FALLBACK'
  | 'HTML_METADATA'
  | 'WEBSITE_EXPORT';

export interface WebsiteConfig {
  id: string;
  url: string;
  name: string;
  authType: AuthType;
  isActive: boolean;
  lastConnected: number;
  apiHealth: 'UP' | 'DOWN' | 'UNKNOWN';
  manifestVersion?: string;
  isOfflineMode?: boolean;
}

export interface ApiOperation {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  requestSchema?: Record<string, any>;
  responseSchema?: Record<string, any>;
  verified: boolean;
}

export interface DiscoveredFeature {
  id: string;
  name: string;
  description: string;
  hubId: 'hub_owner' | 'hub_manager' | 'hub_general';
  route: string;
  uiStructure: {
    componentType: string;
    hasForm: boolean;
    hasTable: boolean;
    hasCanvas: boolean;
    formFields: Array<{ name: string; type: string; required: boolean; label: string }>;
    buttons: Array<{ label: string; action: string; isDestructive: boolean }>;
  };
  interactions: string[];
  apiOperations: ApiOperation[];
  permissions: string[];
  businessRules: string[];
  assets: Array<{ id: string; url: string; type: 'ICON' | 'IMAGE' | 'LOGO' | 'STYLE' }>;
  dependencies: string[]; // List of other feature IDs
  discoverySource: DiscoverySource;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'PARTIAL' | 'FAILED';
  implementationStatus: FeatureStatus;
  chosenOption: ImplementationOption;
  confidenceScore: number; // 0 - 100
  isDestructive: boolean;
  implementationPlan?: AiImplementationPlan;
  testResults?: FeatureTestSummary;
  lastVerified: string;
  manualOverride?: {
    forcedOption?: ImplementationOption;
    userNote?: string;
    overriddenBy: string;
    timestamp: number;
  };
}

export interface AiImplementationPlan {
  featureId: string;
  recommendedOption: ImplementationOption;
  nativeFeasibilityScore: number; // 0 - 100
  rationale: string;
  evidenceReferences: string[];
  missingPrerequisites: string[];
  actionSteps: string[];
  componentTemplate: string;
  fallbackUrl?: string;
}

export interface FeatureTestSummary {
  passed: boolean;
  score: number; // 0 - 100
  checks: Array<{
    name: string;
    category:
      | 'VISUAL_STRUCTURE'
      | 'NAVIGATION'
      | 'BUTTON_ACTIONS'
      | 'FORM_VALIDATION'
      | 'API_COMMUNICATION'
      | 'DATA_ACCURACY'
      | 'PERMISSION_ENFORCEMENT'
      | 'ERROR_HANDLING'
      | 'LOADING_BEHAVIOUR'
      | 'EMPTY_STATES'
      | 'WORKFLOW_COMPLETION';
    passed: boolean;
    details: string;
  }>;
  testedAt: number;
}

export interface DiscoveredPage {
  id: string;
  path: string;
  title: string;
  isProtected: boolean;
  source: DiscoverySource;
  statusCode: number;
}

export interface DiscoveredWorkflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
  requiredPermissions: string[];
  associatedFeatures: string[];
}

export interface DiscoveredAsset {
  id: string;
  url: string;
  type: string;
  isAuthorized: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  category:
    | 'DISCOVERY_SESSION'
    | 'AI_ANALYSIS'
    | 'FEATURE_CHANGE'
    | 'IMPLEMENTATION_ATTEMPT'
    | 'TEST_EXECUTION'
    | 'USER_APPROVAL'
    | 'ROLLBACK';
  title: string;
  details: string;
  performedBy: string;
  websiteId: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  sanitizedMetadata?: Record<string, any>;
}

export interface ManifestVersion {
  versionId: string;
  websiteId: string;
  version: string;
  timestamp: number;
  featuresCount: number;
  pagesCount: number;
  rawJson: string;
  isCurrent: boolean;
}

export interface DiscoveryStageItem {
  id: number;
  code: string;
  title: string;
  description: string;
  targetEndpoint: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WARNING' | 'FAILED' | 'SKIPPED';
  latencyMs?: number;
  details?: string;
}

export interface TransparentCoverageReport {
  pagesDiscovered: number;
  totalPagesExpected: number | null;
  featuresDiscovered: number;
  componentsVerified: number;
  apiOperationsVerified: number;
  workflowsIdentified: number;
  permissionsMapped: number;
  assetsIdentified: number;
  inaccessibleCount: number;
  undocumentedCount: number;
  nativeReadyCount: number;
  webViewFallbackCount: number;
  needsConfigCount: number;
  unavailableCount: number;
  overallCompletenessPct: number; // strictly capped unless proven exhaustive
  isExhaustiveEvidenceSupplied: boolean;
  confidenceReasoning: string;
}

export interface ChangeDetectionDiff {
  previousVersion: string | null;
  currentVersion: string;
  addedFeatures: DiscoveredFeature[];
  removedFeatures: DiscoveredFeature[];
  modifiedFeatures: Array<{
    feature: DiscoveredFeature;
    changes: string[];
  }>;
  hasBreakingChanges: boolean;
}
