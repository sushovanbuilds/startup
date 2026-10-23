/**
 * Plan entitlements configuration - single source of truth.
 * Matches PRD plans: Free, Solo, Agency Starter, Agency Pro.
 * All limits are enforced before scans, crawls, AI calls, PDF exports.
 */

export type PlanName = 'free' | 'solo' | 'agency_starter' | 'agency_pro';

export interface Entitlements {
  sites: number;
  scan_frequency: 'manual' | 'weekly' | 'monthly';
  crawled_pages_per_month: number;
  history_days: number;
  ai_calls_per_month: number;
  pdf_exports_per_month: number;
  team_seats: number;
  white_label: boolean;
  alert_rules: boolean;
  scheduled_scans: boolean;
  client_reports: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanName, Entitlements> = {
  free: {
    sites: 1,
    scan_frequency: 'manual',
    crawled_pages_per_month: 0,
    history_days: 0,
    ai_calls_per_month: 0,
    pdf_exports_per_month: 0,
    team_seats: 1,
    white_label: false,
    alert_rules: false,
    scheduled_scans: false,
    client_reports: false,
  },
  solo: {
    sites: 3,
    scan_frequency: 'weekly',
    crawled_pages_per_month: 100,
    history_days: 30,
    ai_calls_per_month: 100,
    pdf_exports_per_month: 10,
    team_seats: 1,
    white_label: false,
    alert_rules: false,
    scheduled_scans: true,
    client_reports: false,
  },
  agency_starter: {
    sites: 10,
    scan_frequency: 'monthly',
    crawled_pages_per_month: 500,
    history_days: 90,
    ai_calls_per_month: 500,
    pdf_exports_per_month: 50,
    team_seats: 3,
    white_label: true,
    alert_rules: false,
    scheduled_scans: true,
    client_reports: true,
  },
  agency_pro: {
    sites: 30,
    scan_frequency: 'monthly',
    crawled_pages_per_month: 2000,
    history_days: 365,
    ai_calls_per_month: 2000,
    pdf_exports_per_month: 200,
    team_seats: 10,
    white_label: true,
    alert_rules: true,
    scheduled_scans: true,
    client_reports: true,
  },
};

export const PLAN_PRICES_INR: Record<PlanName, number> = {
  free: 0,
  solo: 499,
  agency_starter: 1499,
  agency_pro: 4999,
};

export const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  free: 'Free',
  solo: 'Solo',
  agency_starter: 'Agency Starter',
  agency_pro: 'Agency Pro',
};

export function getEntitlements(plan: PlanName): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}

export function canScheduleScans(plan: PlanName): boolean {
  return PLAN_ENTITLEMENTS[plan].scheduled_scans;
}

export function getMaxSites(plan: PlanName): number {
  return PLAN_ENTITLEMENTS[plan].sites;
}

export function getCrawledPagesLimit(plan: PlanName): number {
  return PLAN_ENTITLEMENTS[plan].crawled_pages_per_month;
}

export function getAiCallsLimit(plan: PlanName): number {
  return PLAN_ENTITLEMENTS[plan].ai_calls_per_month;
}

export function getPdfExportsLimit(plan: PlanName): number {
  return PLAN_ENTITLEMENTS[plan].pdf_exports_per_month;
}

export function getHistoryDays(plan: PlanName): number {
  return PLAN_ENTITLEMENTS[plan].history_days;
}

export function getTeamSeats(plan: PlanName): number {
  return PLAN_ENTITLEMENTS[plan].team_seats;
}

export function hasWhiteLabel(plan: PlanName): boolean {
  return PLAN_ENTITLEMENTS[plan].white_label;
}

export function hasAlertRules(plan: PlanName): boolean {
  return PLAN_ENTITLEMENTS[plan].alert_rules;
}

export function hasClientReports(plan: PlanName): boolean {
  return PLAN_ENTITLEMENTS[plan].client_reports;
}

export type UsageCounters = {
  scans: number;
  crawled_pages: number;
  ai_calls: number;
  pdf_exports: number;
};

export function checkEntitlement(
  plan: PlanName,
  usage: UsageCounters,
  action: 'scan' | 'crawl' | 'ai_call' | 'pdf_export',
  quantity = 1
): { allowed: boolean; reason?: string } {
  const entitlements = PLAN_ENTITLEMENTS[plan];

  switch (action) {
    case 'scan':
      if (usage.scans + quantity > entitlements.sites * 4) {
        return { allowed: false, reason: 'Scan quota exceeded for this plan' };
      }
      break;
    case 'crawl':
      if (usage.crawled_pages + quantity > entitlements.crawled_pages_per_month) {
        return { allowed: false, reason: 'Crawled pages limit exceeded for this month' };
      }
      break;
    case 'ai_call':
      if (usage.ai_calls + quantity > entitlements.ai_calls_per_month) {
        return { allowed: false, reason: 'AI calls limit exceeded for this month' };
      }
      break;
    case 'pdf_export':
      if (usage.pdf_exports + quantity > entitlements.pdf_exports_per_month) {
        return { allowed: false, reason: 'PDF exports limit exceeded for this month' };
      }
      break;
  }

  return { allowed: true };
}