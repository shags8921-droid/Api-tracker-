/**
 * Business Intelligence Domain Types for Phase 8 Advanced AI Assistant
 */

export interface BusinessKpiSummary {
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  shippedOrdersCount: number;
  pendingOrdersCount: number;
  lowStockItemsCount: number;
  totalCatalogSkus: number;
  activeUsersCount: number;
  activeWebhooksCount: number;
  systemHealth: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  text: string;
  timestamp: number;
  dataEvidence?: {
    sourceEndpoint: string;
    reportingPeriod: string;
    recordCount?: number;
    kpis?: Record<string, any>;
  };
  suggestedActions?: Array<{
    label: string;
    actionType: 'NAVIGATE' | 'PREPARE_ACTION' | 'GENERATE_REPORT';
    payload: any;
    isDestructive?: boolean;
  }>;
  preparedAction?: {
    actionId: string;
    description: string;
    endpoint: string;
    method: 'POST' | 'PATCH' | 'DELETE';
    payload: any;
    requiredRole: 'OWNER' | 'MANAGER';
    isDestructive: boolean;
    previewSummary: string;
    executed?: boolean;
    resultMessage?: string;
  };
}

export interface AiReportRequest {
  title: string;
  dateRange: string;
  generatedAt: number;
  generatedByRole: 'OWNER' | 'MANAGER';
  kpis: Record<string, any>;
  rows: Array<Record<string, any>>;
  summaryText: string;
}

export interface BusinessAlert {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  category: 'INVENTORY' | 'ORDERS' | 'SYSTEM' | 'SECURITY';
  title: string;
  description: string;
  timestamp: number;
  isRead: boolean;
  actionRoute?: string;
}
