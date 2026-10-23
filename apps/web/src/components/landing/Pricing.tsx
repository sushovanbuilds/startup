import { ArrowRight } from 'lucide-react';
import {
  PLAN_DISPLAY_NAMES,
  PLAN_ENTITLEMENTS,
  PLAN_PRICES_INR,
  type PlanName,
} from '@sitehealth/shared/plans';

/**
 * Pricing ledger. All names, prices and entitlement lines come from
 * packages/shared/plans.ts (single source of truth) — no hardcoded prices.
 */

interface FeatureLine {
  text: string;
  cls: string;
}

const fmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function featureLines(plan: PlanName): FeatureLine[] {
  const e = PLAN_ENTITLEMENTS[plan];
  switch (plan) {
    case 'free':
      return [
        { text: '1 Site', cls: 'text-carbon font-bold' },
        { text: 'Manual Instant Scans', cls: 'text-ink-muted' },
        { text: 'Perf + SEO + Posture Checks', cls: 'text-carbon font-medium' },
        { text: 'No Scan History', cls: 'text-ink-muted' },
        { text: 'White-Label PDF Dossiers', cls: 'text-ink-muted line-through' },
      ];
    case 'solo':
      return [
        { text: `${e.sites} Client Sites`, cls: 'text-carbon font-bold' },
        { text: 'Weekly Scan Cadence', cls: 'text-ink-muted' },
        { text: `${e.crawled_pages_per_month} Crawled Pages / mo`, cls: 'text-carbon font-medium' },
        { text: `${e.history_days}-Day Scan History`, cls: 'text-ink-muted' },
        { text: 'Standard PDF Export', cls: 'text-carbon font-medium' },
      ];
    case 'agency_starter':
      return [
        { text: `${e.sites} Client Sites`, cls: 'text-carbon font-bold' },
        { text: `${e.crawled_pages_per_month} Crawled Pages / mo`, cls: 'text-carbon font-semibold' },
        { text: 'White-Label Custom Domain', cls: 'text-carbon font-semibold' },
        { text: 'Client Token Portals', cls: 'text-carbon font-semibold' },
        { text: 'Automated PDF Dispatch', cls: 'text-carbon font-bold' },
      ];
    case 'agency_pro':
      return [
        { text: `${e.sites} Client Sites`, cls: 'text-carbon font-bold' },
        { text: `${e.crawled_pages_per_month} Crawled Pages / mo`, cls: 'text-carbon font-semibold' },
        { text: 'Slack & Webhook Directives', cls: 'text-carbon font-semibold' },
        { text: 'Full REST API Access', cls: 'text-carbon font-semibold' },
        { text: `${e.history_days}-Day Scan History`, cls: 'text-carbon font-semibold' },
      ];
  }
}

const ORDER: PlanName[] = ['free', 'solo', 'agency_starter', 'agency_pro'];
const HEADERS: Record<PlanName, string> = {
  free: 'STARTER TIER',
  solo: 'BOUTIQUE SOLO',
  agency_starter: 'GROWING STUDIO',
  agency_pro: 'SCALE FLEET',
};
const FOOTNOTE: Record<PlanName, string> = {
  free: 'FREE FOREVER',
  solo: 'BILLED MONTHLY',
  agency_starter: 'FLEET LICENSURE',
  agency_pro: 'ENTERPRISE SCALE',
};

export function Pricing() {
  return (
    <section
      className="w-full bg-paper-low px-4 sm:px-8 lg:px-12 py-16 border-b border-rule"
      id="licensure"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-10 pb-4 border-b border-rule gap-4">
          <div>
            <span className="font-mono text-xs uppercase text-carbon font-bold tracking-widest">
              05 // LICENSURE
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-carbon tracking-tight mt-1">
              Commodity pricing for agency balance sheets.
            </h2>
          </div>
          <p className="text-sm text-ink-muted max-w-sm font-sans">
            Flat fleet pricing without per-seat fees. Pays for itself with a single
            retained client relationship.
          </p>
        </div>

        {/* 4-Column Broadsheet Table */}
        <div className="w-full overflow-x-auto border-t border-l border-carbon/20">
          <div className="min-w-[840px] grid grid-cols-4">
            {ORDER.map((plan) => {
              const featured = plan === 'agency_starter';
              const price = PLAN_PRICES_INR[plan];
              return featured ? (
                /* Recommended tier — signal-ruled, raised badge */
                <div
                  key={plan}
                  className="motion-pricing-row border-r border-b-2 border-carbon/20 border-b-signal p-6 bg-paper-mid relative flex flex-col justify-between"
                >
                  <div className="absolute -top-3 left-4 bg-signal text-carbon px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase">
                    RECOMMENDED
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-carbon font-bold uppercase tracking-widest">
                      {HEADERS[plan]}
                    </div>
                    <h3 className="font-display text-2xl text-carbon mt-1 font-normal">
                      {PLAN_DISPLAY_NAMES[plan]}
                    </h3>
                    <div className="font-mono text-4xl text-carbon my-3 font-semibold">
                      {fmt.format(price)}
                      <span className="text-xs text-ink-muted font-normal">/mo</span>
                    </div>
                    <div className="font-mono text-[10px] text-carbon font-bold uppercase">
                      {FOOTNOTE[plan]}
                    </div>
                    <div className="mt-6 pt-4 border-t border-carbon/20 space-y-2.5 font-mono text-xs">
                      {featureLines(plan).map((f) => (
                        <div key={f.text} className={f.cls}>
                          {f.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="mt-8 w-full py-3 bg-carbon text-white font-mono text-xs uppercase font-bold hover:bg-signal hover:text-carbon transition-colors flex items-center justify-center gap-1.5">
                    <span>Deploy Starter Fleet</span>
                    <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div
                  key={plan}
                  className="motion-pricing-row border-r border-b border-carbon/20 p-6 bg-paper flex flex-col justify-between"
                >
                  <div>
                    <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">
                      {HEADERS[plan]}
                    </div>
                    <h3 className="font-display text-2xl text-carbon mt-1 font-normal">
                      {PLAN_DISPLAY_NAMES[plan]}
                    </h3>
                    <div className="font-mono text-4xl text-carbon my-3 font-semibold">
                      {price === 0 ? '₹0' : fmt.format(price)}
                      <span className="text-xs text-ink-muted font-normal">/mo</span>
                    </div>
                    <div className="font-mono text-[10px] text-ink-muted uppercase">
                      {FOOTNOTE[plan]}
                    </div>
                    <div className="mt-6 pt-4 border-t border-rule space-y-2.5 font-mono text-xs">
                      {featureLines(plan).map((f) => (
                        <div key={f.text} className={f.cls}>
                          {f.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="mt-8 w-full py-2.5 bg-paper border border-carbon text-carbon font-mono text-xs uppercase font-bold hover:bg-paper-mid transition-colors">
                    {plan === 'free' ? 'Start Free' : `Select ${PLAN_DISPLAY_NAMES[plan]}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
