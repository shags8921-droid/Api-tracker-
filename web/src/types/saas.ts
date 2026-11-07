/**
 * Multi-Tenant SaaS Domain Types for SitePulse AI — Phase 9
 */

export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS';

export interface PlanLimits {
  maxWebsites: number;
  maxUsers: number;
  monthlyAiRequests: number;
  storageMb: number;
  advancedReports: boolean;
  webhooksEnabled: boolean;
  prioritySupport: boolean;
}

export interface OrganisationTenant {
  id: string;
  name: string;
  slug: string;
  category: 'RETAIL' | 'LOGISTICS' | 'SAAS' | 'MANUFACTURING' | 'HEALTHCARE' | 'HOSPITALITY';
  createdAt: number;
  ownerId: string;
  subscription: {
    tier: SubscriptionTier;
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
    expiresAt: number;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    paymentMethodConfigured: boolean;
    limits: PlanLimits;
  };
  usage: {
    aiRequestsThisMonth: number;
    totalApiRequests: number;
    storageUsedMb: number;
  };
  settings: {
    defaultTimezone: string;
    currency: string;
    enableMultiWebsiteAggregation: boolean;
  };
}

export interface TenantWebsiteConnection {
  id: string;
  orgId: string;
  name: string;
  url: string;
  connectionType: 'PRIMARY_WEB' | 'STORE' | 'ERP_INVENTORY' | 'SUPPORT_PORTAL';
  authType: 'OAUTH2_PKCE' | 'BEARER_TOKEN' | 'API_KEY';
  status: 'CONNECTED' | 'AUTHENTICATING' | 'DISCONNECTED' | 'ERROR';
  apiHealth: 'UP' | 'DOWN' | 'DEGRADED';
  manifestVersion: string;
  lastSyncAt: number;
  featuresDiscoveredCount: number;
}

export interface TenantUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: 'ORG_OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'READ_ONLY';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: number;
  lastActiveAt: number;
}

export interface OnboardingStepItem {
  id: string;
  num: number;
  title: string;
  description: string;
  completed: boolean;
  actionRoute: string;
}

export interface PlatformMetrics {
  totalOrganisations: number;
  activeOrganisations: number;
  activeSubscriptions: Record<SubscriptionTier, number>;
  totalConnectedWebsites: number;
  totalPlatformAiCalls: number;
  systemHealth: string;
  recentTenants: Array<{
    id: string;
    name: string;
    tier: SubscriptionTier;
    joined: number;
  }>;
}
