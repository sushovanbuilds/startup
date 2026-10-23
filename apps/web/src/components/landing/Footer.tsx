/**
 * Rigid archival footer with monumental cropped wordmark.
 */
export function Footer() {
  const columns = [
    {
      title: '01 // TELEMETRY',
      links: ['Edge Synthetics', 'DOM Tree Audits', 'Render Timeline', 'Core Vitals Trace'],
    },
    {
      title: '02 // PROTOCOL',
      links: ['Protocol Spec', 'API Reference', 'Fleet Licensure', 'Changelog [v4.8]'],
    },
    {
      title: '03 // REGISTER',
      links: ['Privacy Attestation', 'Terms of Service', 'Security Posture', 'Public Probe Node'],
    },
  ];

  return (
    <footer className="w-full bg-paper-low text-ink relative overflow-hidden border-t border-rule">
      <div className="w-full px-4 sm:px-8 lg:px-12 pt-16 pb-8 relative">
        <div className="absolute top-0 left-4 sm:left-8 lg:left-12 -translate-y-1/2 text-ink-muted font-mono text-xs select-none pointer-events-none">
          +
        </div>
        <div className="absolute top-0 right-4 sm:right-8 lg:right-12 -translate-y-1/2 text-ink-muted font-mono text-xs select-none pointer-events-none">
          +
        </div>
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <div className="md:col-span-5 flex flex-col justify-between pr-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl text-carbon font-normal">
                  SiteHealth
                </span>
                <span className="font-mono text-[10px] text-carbon font-semibold tracking-widest border border-signal/30 px-1">
                  INDEX_084/REV.B
                </span>
              </div>
              <p className="text-xs text-ink-muted max-w-sm font-mono leading-relaxed">
                Autonomous telemetry and infrastructure diagnostic console engineered
                for digital studios and mission-critical client rosters.
              </p>
            </div>
            <div className="pt-6 hidden md:block">
              <div className="font-mono text-[11px] text-ink-muted uppercase tracking-widest">
                OBSERVATION MATRIX
              </div>
              <div className="font-mono text-sm text-carbon font-semibold tracking-tight">
                1,440.00 PX // EDITORIAL CANON
              </div>
            </div>
          </div>
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 font-mono text-xs">
            {columns.map((col) => (
              <div key={col.title} className="space-y-3">
                <div className="uppercase text-carbon font-bold tracking-wider text-[11px]">
                  {col.title}
                </div>
                <ul className="space-y-2 text-ink-muted">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a className="hover:text-carbon transition-colors inline-block py-2 -my-2" href="#">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-[1440px] mx-auto pt-6 border-t border-rule flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-[11px] text-ink-muted">
          <div>PRECISION TELEMETRY INSTRUMENT © 2025 SITEHEALTH ARCHIVAL SYSTEMS INC.</div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-signal"></span>PROBE US-EAST: ACTIVE
            </span>
            <span>{'//'}</span>
            <span>LATENCY: 0.04 MS</span>
          </div>
        </div>
      </div>
      {/* Monumental Cropped Wordmark (decorative) */}
      <div
        aria-hidden="true"
        className="w-full overflow-hidden select-none pointer-events-none opacity-[0.05] -mb-6 sm:-mb-12 lg:-mb-16"
      >
        <span
          data-wm="SITEHEALTH"
          className="wm-after block font-display text-[8rem] sm:text-[14rem] lg:text-[19rem] leading-none tracking-tighter text-carbon whitespace-nowrap text-center"
        ></span>
      </div>
    </footer>
  );
}
