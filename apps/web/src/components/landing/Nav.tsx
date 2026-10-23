import { ArrowUpRight } from 'lucide-react';

/**
 * Fixed instrument banner + sub-header telemetry ribbon.
 * Ported from the Stitch "Technical Broadsheet" desktop design.
 */
export function Nav() {
  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-paper/95 backdrop-blur-md border-b border-rule">
        <div className="h-14 w-full px-4 sm:px-8 lg:px-12 flex items-center justify-between relative">
          <div className="motion-drift absolute -bottom-[5px] left-4 sm:left-8 lg:left-12 text-ink-muted font-mono text-[11px] select-none pointer-events-none leading-none">
            +
          </div>
          <div className="motion-drift absolute -bottom-[5px] right-4 sm:right-8 lg:right-12 text-ink-muted font-mono text-[11px] select-none pointer-events-none leading-none">
            +
          </div>

          {/* Logotype & Diagnostic Status */}
          <div className="flex items-center gap-5">
            <a className="flex items-baseline gap-1 group" href="#">
              <span className="font-display text-2xl tracking-tight text-carbon font-normal">
                SiteHealth
              </span>
              <span className="font-mono text-[11px] text-carbon font-semibold tracking-wider">
                ®
              </span>
            </a>
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-rule py-0.5">
              <span className="inline-block w-1.5 h-1.5 bg-signal animate-pulse"></span>
              <span className="font-mono text-[11px] text-ink-muted uppercase tracking-wider">
                SYSTEM: STABLE // SCAN NODES: US-EAST, EU-CENTRAL
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-8 text-[12px] font-mono uppercase tracking-widest text-ink-muted"
          >
            <a
              className="text-carbon font-semibold underline decoration-signal decoration-2 underline-offset-8"
              href="#protocol"
            >
              01 // Protocol
            </a>
            <a className="hover:text-carbon transition-colors inline-block py-2 -my-2" href="#dossier">
              02 // Retainer Dossier
            </a>
            <a className="hover:text-carbon transition-colors inline-block py-2 -my-2" href="#ledger">
              03 // Drift Ledger
            </a>
            <a className="hover:text-carbon transition-colors inline-block py-2 -my-2" href="#whitelabel">
              04 // Sovereignty
            </a>
            <a className="hover:text-carbon transition-colors inline-block py-2 -my-2" href="#licensure">
              05 // Licensure
            </a>
          </nav>

          {/* Action */}
          <div className="flex items-center gap-4">
            <a
              className="px-4 py-2 bg-signal text-carbon font-mono text-[11px] uppercase font-bold tracking-wider hover:bg-carbon hover:text-white transition-colors flex items-center gap-1.5"
              href="#scan"
            >
              <span>Run Free Scan</span>
              <ArrowUpRight className="h-[14px] w-[14px]" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      {/* SUB-HEADER TELEMETRY RIBBON */}
      <aside
        aria-label="System Status"
        className="w-full bg-paper-low border-b border-rule"
      >
        <div className="px-4 sm:px-8 lg:px-12 py-2 flex flex-wrap items-center justify-between gap-y-2 text-ink-muted font-mono text-[11px] uppercase tracking-wider">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-carbon font-semibold">
              <span className="w-1.5 h-1.5 bg-signal"></span>
              PROBE ENGINE v4.8
            </span>
            <span className="text-ink-muted">/</span>
            <span>PROTOCOL: ISO/IEC 25010 ALIGNED</span>
            <span className="text-ink-muted">/</span>
            <span className="hidden sm:inline">ROSTER CAPACITY: UNRESTRICTED</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-carbon font-medium">
              RETAINER TELEMETRY SPECIFICATION
            </span>
            <span className="text-carbon font-bold">[ AMBIENT DRIFT COURIER ]</span>
          </div>
        </div>
      </aside>
    </>
  );
}
