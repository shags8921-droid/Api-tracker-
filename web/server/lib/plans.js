/**
 * Single source of truth for pricing plans, limits and entitlement resolution.
 */
export const PLANS = [
  {
    id: 'plan_free', tier: 'FREE', name: 'Evaluation Sandbox',
    tagline: 'Automatic website discovery and feature feasibility testing',
    monthlyUsd: 0, annualUsd: 0, monthlyNpr: 0, annualNpr: 0,
    features: ['1 Connected Website', '2 Workspace Team Members', '250 AI Queries / mo', 'Basic Feature Discovery', 'Read-Only Hub Feasibility'],
    limits: { maxWebsites: 1, maxUsers: 2, monthlyAiRequests: 250, storageMb: 100, webhooksEnabled: false, advancedReports: false, dedicatedSupport: false }
  },
  {
    id: 'plan_starter', tier: 'STARTER', name: 'Growth Starter',
    tagline: 'Small business operations with online store integration',
    monthlyUsd: 49, annualUsd: 470, monthlyNpr: 6500, annualNpr: 62400,
    features: ['2 Connected Websites', '5 Team Members', '1,000 AI Queries / mo', 'Full Hub Replication', 'Order Dispatch & Inventory Alerts'],
    limits: { maxWebsites: 2, maxUsers: 5, monthlyAiRequests: 1000, storageMb: 256, webhooksEnabled: true, advancedReports: false, dedicatedSupport: false },
    isPopular: true
  },
  {
    id: 'plan_pro', tier: 'PROFESSIONAL', name: 'Commercial Pro',
    tagline: 'Multi-channel enterprises with real-time sync & AI actions',
    monthlyUsd: 149, annualUsd: 1430, monthlyNpr: 19800, annualNpr: 190000,
    features: ['5 Connected Websites', '15 Team Members', '5,000 AI Queries / mo', 'Voice Assistant Integration', 'Full Webhook Event Relay', 'Custom Business Reports'],
    limits: { maxWebsites: 5, maxUsers: 15, monthlyAiRequests: 5000, storageMb: 1024, webhooksEnabled: true, advancedReports: true, dedicatedSupport: true }
  },
  {
    id: 'plan_business', tier: 'BUSINESS', name: 'Scale Enterprise',
    tagline: 'High-volume distributed operations across platforms',
    monthlyUsd: 399, annualUsd: 3830, monthlyNpr: 53000, annualNpr: 508800,
    features: ['25 Connected Websites', '50 Team Members', '25,000 AI Queries / mo', 'Dedicated Technical SLA', 'Continuous Idempotent Sync', 'Enterprise Multi-Role Hierarchy'],
    limits: { maxWebsites: 25, maxUsers: 50, monthlyAiRequests: 25000, storageMb: 5120, webhooksEnabled: true, advancedReports: true, dedicatedSupport: true }
  }
];

export const FREE_PLAN = PLANS[0];
export const GATEWAYS = ['ESEWA', 'KHALTI', 'FONEPAY', 'STRIPE_INTL'];
export const DAY_MS = 86_400_000;

export const findPlan = (id) => PLANS.find((p) => p.id === id) || null;

export function planPrice(plan, currency, cycle) {
  const annual = cycle === 'ANNUAL';
  if (currency === 'NPR') return annual ? plan.annualNpr : plan.monthlyNpr;
  return annual ? plan.annualUsd : plan.monthlyUsd;
}

/** Legacy limit shape used by the org record (adds prioritySupport alias). */
export function orgLimitsFor(plan) {
  const l = plan.limits;
  return { ...l, prioritySupport: l.dedicatedSupport };
}

/**
 * The subscription that actually applies right now. A paid plan whose period has ended
 * falls back to FREE limits; it is never silently extended.
 */
export function effectiveSubscription(org, now = Date.now()) {
  const sub = org.subscription || {};
  const paidTier = sub.tier && sub.tier !== 'FREE';
  const expired = paidTier && (!sub.expiresAt || sub.expiresAt <= now || sub.status !== 'ACTIVE');
  if (expired) {
    return { ...sub, tier: 'FREE', status: 'EXPIRED', expiredTier: sub.tier, limits: orgLimitsFor(FREE_PLAN) };
  }
  const plan = PLANS.find((p) => p.tier === sub.tier);
  return { ...sub, limits: plan ? orgLimitsFor(plan) : sub.limits || orgLimitsFor(FREE_PLAN) };
}
