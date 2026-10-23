/**
 * Forensic chronology: dark inverted-carbon drift ledger with sparkline.
 */
export function ChangesDark() {
  const events = [
    {
      ts: '2025-05-18 04:12 UTC',
      host: 'arc-furniture.com',
      desc: 'Third-party marketing container injected +142KB script (+180ms Total Blocking Time).',
      badge: 'REGRESSION DETECTED',
      badgeClass: 'bg-signal text-white',
    },
    {
      ts: '2025-05-16 11:02 UTC',
      host: 'studio-nordic.dk',
      desc: '3 circular staging redirects identified following staging sync; automated rewrite map generated.',
      badge: 'AUTO-PATCH DIRECTIVE',
      badgeClass: 'border border-white/30 text-white',
    },
    {
      ts: '2025-05-14 08:15 UTC',
      host: 'keller-associates.law',
      desc: 'Origin SSL certificate renewed 64 days ahead of expiry; cipher suite validated to TLS 1.3.',
      badge: 'RENEWAL VALIDATED',
      badgeClass: 'border border-white/30 text-white',
    },
  ];

  return (
    <section
      className="w-full bg-carbon text-[#F2EFE8] px-4 sm:px-8 lg:px-12 py-16 border-b border-carbon-soft relative"
      id="ledger"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="font-mono text-xs uppercase text-signal font-bold tracking-widest mb-1">
              03 // FORENSIC CHRONOLOGY
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
              What changed <em className="italic font-normal">since last month.</em>
            </h2>
          </div>
          <p className="text-sm text-rule-dark max-w-md">
            Client sites rarely collapse in catastrophic waves. They erode through
            unannounced CMS plugins, bloated analytics containers, and stale staging
            redirects.
          </p>
        </div>

        {/* Diff Ledger Table */}
        <div className="border border-white/20 bg-carbon-soft">
          {/* Ledger Header */}
          <div className="px-5 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between font-mono text-xs text-rule-dark">
            <span className="text-white font-semibold">
              FLEET DRIFT LEDGER // AUDITED EVENTS
            </span>
            <span className="text-signal flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 bg-signal"></span>
              REAL-TIME ANOMALY PARSER: ACTIVE
            </span>
          </div>

          {/* Events */}
          <div className="divide-y divide-white/10 font-mono text-[13px]">
            {events.map((ev) => (
              <div
                key={ev.ts}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-2 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-rule-dark text-[11px]">{ev.ts}</span>
                  <span className="text-white font-bold">{ev.host}</span>
                </div>
                <div className="text-[#DCDAD3] text-[13px] flex-1 lg:px-8">
                  {ev.desc}
                </div>
                <div className="shrink-0">
                  <span
                    className={`px-2.5 py-1 font-bold text-[10px] tracking-wider uppercase ${ev.badgeClass}`}
                  >
                    {ev.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 30-Day Stability Sparkline Trace */}
          <div className="p-5 bg-white/[0.02] border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="text-rule-dark">
              <span className="text-white font-bold">
                FLEET STABILITY COEFFICIENT (30-DAY TIMELINE):
              </span>
              <span className="ml-2">99.4% → 97.2% → 99.8% OPTIMAL</span>
            </div>
            <div className="w-full md:w-80 h-8 flex items-center">
              <svg
                className="w-full h-full text-signal ml-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 320 30"
              >
                <polyline
                  fill="none"
                  points="0,15 35,14 70,18 105,8 140,24 175,10 210,12 245,6 280,8 320,5"
                  strokeLinecap="square"
                  strokeWidth="1.8"
                />
                <circle className="fill-white stroke-signal" cx="140" cy="24" r="2.5" strokeWidth="1.5" />
                <circle className="fill-white stroke-signal" cx="320" cy="5" r="2.5" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
