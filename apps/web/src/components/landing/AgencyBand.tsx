/**
 * White-label sovereignty: three customization pillar tiles.
 */
export function AgencyBand() {
  const pillars = [
    {
      cat: 'PORTAL DEPLOYMENT',
      badge: 'CUSTOM CNAME',
      title: 'audit.youragency.com',
      sub: 'Complete Subdomain Delegation',
      body: 'Automatic SSL certificate provisioning, custom SVG logo insertion, and bespoke stylesheets for seamless integration with your client hub.',
    },
    {
      cat: 'SECURITY BOUNDARY',
      badge: 'TOKENIZED SHARING',
      title: 'Client Access Tokens',
      sub: 'Granular Non-Login URLs',
      body: 'Share live telemetry views directly with client stakeholders via cryptographic URLs. Zero exposure to your internal margins or billing plans.',
    },
    {
      cat: 'RETAINER AUTOMATION',
      badge: '1ST OF MONTH',
      title: 'Automated PDF Dispatch',
      sub: 'Bespoke Monograph Delivery',
      body: 'Every month, compile and dispatch archival PDF health summaries stamped with your agency credentials directly to account point-of-contacts.',
    },
  ];

  return (
    <section
      className="w-full bg-paper px-4 sm:px-8 lg:px-12 py-16 border-b border-rule"
      id="whitelabel"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-10 pb-4 border-b border-rule flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase text-carbon font-bold tracking-widest">
              04 // WHITE-LABEL SOVEREIGNTY
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-carbon tracking-tight mt-1">
              Your clients never see SiteHealth.
            </h2>
          </div>
          <p className="text-sm text-ink-muted max-w-lg">
            We provide the industrial headless monitoring engine; you deliver the
            strategic counsel and own the client relationship entirely.
          </p>
        </div>

        {/* 3 Customization Pillar Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div
              key={p.cat}
              className="bg-paper-low border border-carbon/20 p-6 relative"
            >
              <div className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mb-4 border-b border-rule pb-2 flex justify-between">
                <span>{p.cat}</span>
                <span className="text-carbon font-bold">{p.badge}</span>
              </div>
              <h3 className="font-display text-2xl text-carbon mb-1">{p.title}</h3>
              <div className="font-mono text-xs text-ink-muted mb-4">{p.sub}</div>
              <p className="text-sm text-ink-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
