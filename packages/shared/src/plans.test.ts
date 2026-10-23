import { describe, it, expect } from 'vitest';
import {
  PLAN_ENTITLEMENTS,
  PLAN_PRICES_INR,
  PLAN_DISPLAY_NAMES,
  getEntitlements,
  canScheduleScans,
  getMaxSites,
  getCrawledPagesLimit,
  getAiCallsLimit,
  getPdfExportsLimit,
  getHistoryDays,
  getTeamSeats,
  hasWhiteLabel,
  hasAlertRules,
  hasClientReports,
  checkEntitlement,
  type PlanName,
  type Entitlements,
  type UsageCounters,
} from './plans';

describe('Plan Entitlements', () => {
  const plans: PlanName[] = ['free', 'solo', 'agency_starter', 'agency_pro'];

  it('has entitlements for all plans', () => {
    for (const plan of plans) {
      expect(PLAN_ENTITLEMENTS[plan]).toBeDefined();
      const ent = PLAN_ENTITLEMENTS[plan];
      expect(typeof ent.sites).toBe('number');
      expect(typeof ent.crawled_pages_per_month).toBe('number');
      expect(typeof ent.history_days).toBe('number');
      expect(typeof ent.ai_calls_per_month).toBe('number');
      expect(typeof ent.pdf_exports_per_month).toBe('number');
      expect(typeof ent.team_seats).toBe('number');
      expect(typeof ent.white_label).toBe('boolean');
      expect(typeof ent.alert_rules).toBe('boolean');
      expect(typeof ent.scheduled_scans).toBe('boolean');
      expect(typeof ent.client_reports).toBe('boolean');
    }
  });

  it('has prices for all plans', () => {
    expect(PLAN_PRICES_INR.free).toBe(0);
    expect(PLAN_PRICES_INR.solo).toBe(499);
    expect(PLAN_PRICES_INR.agency_starter).toBe(1499);
    expect(PLAN_PRICES_INR.agency_pro).toBe(4999);
  });

  it('has display names for all plans', () => {
    expect(PLAN_DISPLAY_NAMES.free).toBe('Free');
    expect(PLAN_DISPLAY_NAMES.solo).toBe('Solo');
    expect(PLAN_DISPLAY_NAMES.agency_starter).toBe('Agency Starter');
    expect(PLAN_DISPLAY_NAMES.agency_pro).toBe('Agency Pro');
  });

  describe('getEntitlements', () => {
    it('returns correct entitlements for each plan', () => {
      expect(getEntitlements('free').sites).toBe(1);
      expect(getEntitlements('solo').sites).toBe(3);
      expect(getEntitlements('agency_starter').sites).toBe(10);
      expect(getEntitlements('agency_pro').sites).toBe(30);
    });
  });

  describe('canScheduleScans', () => {
    it('returns false for free plan', () => {
      expect(canScheduleScans('free')).toBe(false);
    });
    it('returns true for paid plans', () => {
      expect(canScheduleScans('solo')).toBe(true);
      expect(canScheduleScans('agency_starter')).toBe(true);
      expect(canScheduleScans('agency_pro')).toBe(true);
    });
  });

  describe('getMaxSites', () => {
    it('returns correct site limits', () => {
      expect(getMaxSites('free')).toBe(1);
      expect(getMaxSites('solo')).toBe(3);
      expect(getMaxSites('agency_starter')).toBe(10);
      expect(getMaxSites('agency_pro')).toBe(30);
    });
  });

  describe('getCrawledPagesLimit', () => {
    it('returns correct crawl limits', () => {
      expect(getCrawledPagesLimit('free')).toBe(0);
      expect(getCrawledPagesLimit('solo')).toBe(100);
      expect(getCrawledPagesLimit('agency_starter')).toBe(500);
      expect(getCrawledPagesLimit('agency_pro')).toBe(2000);
    });
  });

  describe('getAiCallsLimit', () => {
    it('returns correct AI call limits', () => {
      expect(getAiCallsLimit('free')).toBe(0);
      expect(getAiCallsLimit('solo')).toBe(100);
      expect(getAiCallsLimit('agency_starter')).toBe(500);
      expect(getAiCallsLimit('agency_pro')).toBe(2000);
    });
  });

  describe('getPdfExportsLimit', () => {
    it('returns correct PDF export limits', () => {
      expect(getPdfExportsLimit('free')).toBe(0);
      expect(getPdfExportsLimit('solo')).toBe(10);
      expect(getPdfExportsLimit('agency_starter')).toBe(50);
      expect(getPdfExportsLimit('agency_pro')).toBe(200);
    });
  });

  describe('getHistoryDays', () => {
    it('returns correct history retention', () => {
      expect(getHistoryDays('free')).toBe(0);
      expect(getHistoryDays('solo')).toBe(30);
      expect(getHistoryDays('agency_starter')).toBe(90);
      expect(getHistoryDays('agency_pro')).toBe(365);
    });
  });

  describe('getTeamSeats', () => {
    it('returns correct team seats', () => {
      expect(getTeamSeats('free')).toBe(1);
      expect(getTeamSeats('solo')).toBe(1);
      expect(getTeamSeats('agency_starter')).toBe(3);
      expect(getTeamSeats('agency_pro')).toBe(10);
    });
  });

  describe('hasWhiteLabel', () => {
    it('returns correct white label availability', () => {
      expect(hasWhiteLabel('free')).toBe(false);
      expect(hasWhiteLabel('solo')).toBe(false);
      expect(hasWhiteLabel('agency_starter')).toBe(true);
      expect(hasWhiteLabel('agency_pro')).toBe(true);
    });
  });

  describe('hasAlertRules', () => {
    it('returns correct alert rules availability', () => {
      expect(hasAlertRules('free')).toBe(false);
      expect(hasAlertRules('solo')).toBe(false);
      expect(hasAlertRules('agency_starter')).toBe(false);
      expect(hasAlertRules('agency_pro')).toBe(true);
    });
  });

  describe('hasClientReports', () => {
    it('returns correct client reports availability', () => {
      expect(hasClientReports('free')).toBe(false);
      expect(hasClientReports('solo')).toBe(false);
      expect(hasClientReports('agency_starter')).toBe(true);
      expect(hasClientReports('agency_pro')).toBe(true);
    });
  });

  describe('checkEntitlement', () => {
    const baseUsage: UsageCounters = {
      scans: 0,
      crawled_pages: 0,
      ai_calls: 0,
      pdf_exports: 0,
    };

    it('allows scan within quota for free plan', () => {
      const result = checkEntitlement('free', baseUsage, 'scan', 1);
      expect(result.allowed).toBe(true);
    });

    it('blocks scan when quota exceeded for free plan', () => {
      const usage: UsageCounters = { ...baseUsage, scans: 4 }; // free allows 1 site * 4 = 4 scans
      const result = checkEntitlement('free', usage, 'scan', 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Scan quota exceeded');
    });

    it('allows crawl within quota for solo plan', () => {
      const usage: UsageCounters = { ...baseUsage, crawled_pages: 50 };
      const result = checkEntitlement('solo', usage, 'crawl', 10);
      expect(result.allowed).toBe(true);
    });

    it('blocks crawl when quota exceeded for solo plan', () => {
      const usage: UsageCounters = { ...baseUsage, crawled_pages: 95 };
      const result = checkEntitlement('solo', usage, 'crawl', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Crawled pages limit exceeded');
    });

    it('allows ai_call within quota for agency_starter', () => {
      const usage: UsageCounters = { ...baseUsage, ai_calls: 100 };
      const result = checkEntitlement('agency_starter', usage, 'ai_call', 50);
      expect(result.allowed).toBe(true);
    });

    it('blocks ai_call when quota exceeded for agency_starter', () => {
      const usage: UsageCounters = { ...baseUsage, ai_calls: 480 };
      const result = checkEntitlement('agency_starter', usage, 'ai_call', 50);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('AI calls limit exceeded');
    });

    it('allows pdf_export within quota for agency_pro', () => {
      const usage: UsageCounters = { ...baseUsage, pdf_exports: 50 };
      const result = checkEntitlement('agency_pro', usage, 'pdf_export', 10);
      expect(result.allowed).toBe(true);
    });

    it('blocks pdf_export when quota exceeded for agency_pro', () => {
      const usage: UsageCounters = { ...baseUsage, pdf_exports: 195 };
      const result = checkEntitlement('agency_pro', usage, 'pdf_export', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('PDF exports limit exceeded');
    });

    it('blocks all actions for free plan when at zero limits', () => {
      const usage: UsageCounters = { ...baseUsage, crawled_pages: 0, ai_calls: 0, pdf_exports: 0 };
      expect(checkEntitlement('free', usage, 'crawl', 1).allowed).toBe(false);
      expect(checkEntitlement('free', usage, 'ai_call', 1).allowed).toBe(false);
      expect(checkEntitlement('free', usage, 'pdf_export', 1).allowed).toBe(false);
    });
  });
});