/**
 * Synchronisation, Offline Queue, Conflict Resolution & Quality Assurance Types
 * SitePulse AI — Phase 5 Production Hardening
 */

export type DataOrigin = 'LIVE' | 'CACHED' | 'PENDING' | 'SYNCED' | 'FAILED';

export interface SyncOperationItem {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  requiredRole: 'OWNER' | 'MANAGER';
  requiredPermission?: string;
  isDestructive: boolean;
  status: 'QUEUED' | 'SYNCING' | 'SUCCESS' | 'CONFLICT' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: number;
  createdAt: number;
  errorMessage?: string;
  rollbackPayload?: any;
}

export interface SyncConflict {
  id: string;
  resourceType: 'ORDER' | 'CATALOG' | 'USER' | 'WEBHOOK' | 'CONFIG';
  resourceId: string;
  clientVersion: any;
  serverVersion: any;
  detectedAt: number;
  resolutionStrategy?: 'SERVER_WINS' | 'CLIENT_WINS' | 'MANUAL_MERGE';
  resolved: boolean;
}

export interface SyncStatistics {
  lastSyncTimestamp: number | null;
  totalSynchronised: number;
  pendingQueued: number;
  conflictCount: number;
  failedCount: number;
  averageLatencyMs: number;
  isOnline: boolean;
  isSyncing: boolean;
  rateLimitRemaining?: number;
}

export interface FeatureQualityRecord {
  featureId: string;
  featureName: string;
  hubId: 'hub_owner' | 'hub_manager' | 'hub_general';
  visualStatus: 'PASSED' | 'WARNING' | 'FAILED';
  functionalStatus: 'PASSED' | 'PARTIAL' | 'FALLBACK' | 'FAILED';
  apiStatus: 'CONNECTED' | 'READ_ONLY' | 'UNAVAILABLE';
  permissionStatus: 'VERIFIED' | 'MISSING_ROLE' | 'GATED';
  syncStatus: 'SYNCED' | 'CACHED' | 'QUEUED' | 'CONFLICT';
  testStatus: 'COMPLETE' | 'PARTIALLY_COMPLETE' | 'WEBVIEW_FALLBACK' | 'NEEDS_CONFIGURATION' | 'UNAVAILABLE' | 'TEST_FAILED';
  score: number;
  evidenceNotes: string;
  knownLimitations: string[];
}

export interface BackupSnapshot {
  backupId: string;
  timestamp: number;
  websiteId: string;
  label: string;
  schemaVersion: string;
  featuresCount: number;
  configsCount: number;
  dataHash: string;
  data: {
    websites: any[];
    users: any[];
    orders: any[];
    catalog: any[];
    webhooks: any[];
  };
}
