/**
 * The 4-step agency cadence: headless probes → baseline diff → code pointers →
 * archival dossier. Ruled 4-column matrix.
 */
export function HowItWorks() {
  const steps = [
    {
      n: '01',
      tag: '[ 01 · SWEEP ]',
      title: 'Headless Chrome Edge Probes',
      body: 'Global multi-region headless workers inspect real DOM execution, Core Web Vitals, third-party script bloat, and robots/sitemap deviations every 15 minutes.',
      foot: 'INSTRUMENT: LIGHTHOUSE 11.4 + CHROMIUM 124',
    },
    {
      n: '02',
      tag: '[ 02 · DIFF ]',
      title: 'Baseline Engine Detection',
      body: 'Flags silent code or infrastructure regression before end users or search crawlers notice. Converts noisy telemetry into clear agency incident severity.',
      foot: 'DELTA: ROLLING 30-DAY DRIFT COEFFICIENT',
    },
    {
      n: '03',
      tag: '[ 03 · REMEDIATE ]',
      title: 'Exact Code Pointers',
      body: 'Provides direct technical recommendations: CSS refactors, font-display swaps, uncompressed asset paths, header flags, or DNS expiration notices.',
      foot: 'DISPATCH: GITHUB ISSUE / SLACK / WEBHOOK',
    },
    {
      n: '04',
      tag: '[ 04 · REPORT ]',
      title: 'Archival Retainer Dossier',
      body: 'Outputs pristine white-labeled PDF/A reports and live shareable client links showing proactive stewardship and justifying monthly retainer fees.',
      foot: 'OUTPUT: BESPOKE WHITE-LABEL PDF/A',
    },
  ];

  return (
    <section
      className="w-full bg-paper-low px-4 sm:px-8 lg:px-12 py-16 border-b border-rule relative"
      id="protocol"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-12 gap-4 pb-4 border-b border-rule">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs uppercase text-carbon font-bold tracking-widest">
              01 // PROTOCOL
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-carbon">
              The Agency Cadence
            </h2>
          </div>
          <p className="text-sm text-ink-muted max-w-md">
            Continuous background surveillance turned into high-margin monthly
            retainer deliverables. A disciplined four-stroke cycle.
          </p>
        </div>

        {/* 4-Column Ruled Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-carbon/20">
          {steps.map((s) => (
            <div
              key={s.n}
              className="border-r border-b border-carbon/20 p-6 relative bg-paper hover:bg-paper-mid transition-colors group"
            >
              <span className="absolute top-3 right-3 font-mono text-ink-muted text-xs select-none">
                +
              </span>
              <div
                aria-hidden="true"
                data-wm={s.n}
                className="wm-after font-mono text-5xl text-carbon/15 font-bold tracking-tighter leading-none mb-4 group-hover:text-signal-dim transition-colors"
              ></div>
              <div className="font-mono text-xs uppercase text-carbon font-bold tracking-wider mb-1">
                {s.tag}
              </div>
              <h3 className="font-display text-2xl text-carbon mb-2 font-normal">
                {s.title}
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">{s.body}</p>
              <div className="mt-6 font-mono text-[10px] text-ink-muted border-t border-rule pt-2">
                {s.foot}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
