/**
 * Commercialization, Pricing, Nepal Payment Gateways, Support & Legal Types
 * SitePulse AI — Phase 10 Commercial Launch
 */

export interface PricingPlanConfig {
  id: string;
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
  name: string;
  tagline: string;
  monthlyUsd: number;
  annualUsd: number;
  monthlyNpr: number;
  annualNpr: number;
  features: string[];
  limits: {
    maxWebsites: number;
    maxUsers: number;
    monthlyAiRequests: number;
    storageMb: number;
    webhooksEnabled: boolean;
    advancedReports: boolean;
    dedicatedSupport: boolean;
  };
  isPopular?: boolean;
}

export type PaymentGatewayType = 'ESEWA' | 'KHALTI' | 'FONEPAY' | 'STRIPE_INTL';

export interface PaymentTransactionRecord {
  transactionId: string;
  orgId: string;
  planId: string;
  amount: number;
  currency: 'NPR' | 'USD';
  gateway: PaymentGatewayType;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED';
  gatewayRefId?: string;
  invoiceNumber: string;
  createdAt: number;
  verifiedAt?: number;
}

export interface SupportTicketItem {
  id: string;
  orgId: string;
  orgName: string;
  authorEmail: string;
  subject: string;
  category: 'INTEGRATION_ISSUE' | 'DISCOVERY_BUG' | 'BILLING' | 'FEATURE_REQUEST' | 'SECURITY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED';
  createdAt: number;
  updatedAt: number;
  messages: Array<{
    id: string;
    sender: 'CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM';
    senderName: string;
    messageText: string;
    timestamp: number;
  }>;
}

export interface LegalDocumentItem {
  slug: 'terms' | 'privacy' | 'cookies' | 'refund' | 'security' | 'acceptable-use';
  title: string;
  lastUpdated: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
}
