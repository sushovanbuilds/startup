import { ArrowRight } from 'lucide-react';
import { HeroPlates } from './hero3d/HeroPlates';

/**
 * Hero: editorial narrative + probe console + stat strip on the left,
 * engineered plate-stack apparatus on the right.
 */
export function Hero() {
  return (
    <section className="w-full bg-paper relative px-4 sm:px-8 lg:px-12 pt-12 lg:pt-16 pb-16 border-b border-rule">
      <span className="motion-drift absolute top-0 left-4 sm:left-8 lg:left-12 -translate-y-1/2 text-ink-muted font-mono text-sm select-none">
        ⌖
      </span>
      <span className="motion-drift absolute top-0 right-4 sm:right-8 lg:right-12 -translate-y-1/2 text-ink-muted font-mono text-sm select-none">
        ⌖
      </span>
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">
        {/* Left: Agency Narrative & Scan Console */}
        <div className="lg:col-span-6 flex flex-col justify-between pt-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[11px] uppercase text-carbon font-bold tracking-widest">
                PLATE 01 / INSTRUMENT DISPATCH
              </span>
              <span className="text-ink-muted font-mono text-[11px]">§ 104.28</span>
            </div>
            <h1 className="motion-hero-headline font-display text-4xl sm:text-5xl lg:text-[62px] text-carbon tracking-tight mb-5 leading-[1.04]">
              Your clients’ websites, <em className="italic font-normal">quietly</em>{' '}
              watched.
            </h1>
            <p className="text-[17px] leading-relaxed text-ink-muted max-w-xl mb-8">
              SiteHealth runs automated checks on Core Web Vitals, canonical routing,
              and SSL renewal across your agency client roster. When drift occurs, get
              exact remediation diffs before clients notice.
            </p>
          </div>

          {/* Measuring Field (Instant Scan Module) */}
          <div
            className="bg-paper-mid border border-carbon/25 p-4 sm:p-5 relative mb-8"
            id="scan"
          >
            <div className="absolute -top-2.5 left-4 bg-paper px-2 font-mono text-[10px] text-carbon font-bold tracking-widest uppercase border border-rule">
              PROBE CONSOLE // ZERO SCRIPT INJECTION REQUIRED
            </div>
            {/* Visual-only scan input for now: no API calls in T1.6a */}
            <form className="flex flex-col sm:flex-row gap-2 mt-1">
              <div className="flex-1 flex items-center bg-white border border-carbon/20 px-3 py-2.5 focus-within:border-carbon">
                <span className="font-mono text-xs text-carbon mr-2 select-none font-bold">
                  URI &gt;
                </span>
                <input
                  aria-label="Client website URL to scan"
                  className="w-full bg-transparent font-mono text-[13px] text-carbon placeholder:text-ink-muted/60"
                  placeholder="e.g. meridian-studio.com"
                  type="text"
                  defaultValue="https://meridian-studio.com"
                />
              </div>
              <button
                className="motion-magnetic bg-signal text-carbon font-mono text-[11px] uppercase font-bold tracking-wider px-6 py-3 hover:bg-carbon hover:text-white transition-colors flex items-center justify-center gap-2 shrink-0"
                type="button"
              >
                <span>RUN DIAGNOSTIC</span>
                <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
              </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-between text-ink-muted font-mono text-[10px] uppercase tracking-wider pt-2 border-t border-rule">
              <span>• No credit card</span>
              <span>• Instant 34-point baseline scan</span>
              <span>• Complete PDF dossier preview</span>
            </div>
          </div>

          {/* Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-rule font-mono">
            <div>
              <div className="text-2xl text-carbon font-bold">15-min</div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mt-0.5">
                Sweep Interval
              </div>
            </div>
            <div className="sm:border-l sm:border-rule sm:pl-4">
              <div className="text-2xl text-carbon font-bold">0 Config</div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mt-0.5">
                Client Reports
              </div>
            </div>
            <div className="sm:border-l sm:border-rule sm:pl-4">
              <div className="text-2xl text-carbon font-bold">100%</div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mt-0.5">
                White-label Dossiers
              </div>
            </div>
            <div className="sm:border-l sm:border-rule sm:pl-4">
              <div className="text-2xl text-carbon font-bold">34-pt</div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wider mt-0.5">
                Diagnostic Engine
              </div>
            </div>
          </div>
        </div>

        {/* Right: Engineered Isometric Measuring Plates & Dossier Overlay */}
        <div className="motion-hero-plates lg:col-span-6 relative z-10 mt-4 lg:mt-0">
          <div className="border border-carbon/20 bg-paper-low p-4 sm:p-6 relative overflow-hidden min-h-[580px] flex flex-col justify-between">
            {/* Frame Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rule font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-signal inline-block"></span>
                <span className="font-bold text-carbon uppercase tracking-wider">
                  APPARATUS 03 // 3-TIER ISOMETRIC SENSOR STACK
                </span>
              </div>
              <span className="text-ink-muted">CALIBRATION: LAB-GRADE</span>
            </div>

            {/* Plate Stack */}
            <div className="relative py-4 flex-1 flex flex-col justify-center">
              {/* Three-plate apparatus: 3D scene with static SVG fallback (T1.6d) */}
              <HeroPlates />

              {/* Foreground Archival Inspection Specimen Tag */}
              <div className="mt-4 bg-white border border-carbon/40 p-3 relative font-mono text-[11px]">
                <div className="absolute -top-2.5 right-4 bg-signal text-carbon px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                  SAMPLE CLIENT DOSSIER PROOF
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-rule pb-2 mb-2">
                  <div>
                    <span className="font-bold text-carbon">
                      TARGET: meridian-studio.com
                    </span>
                    <span className="text-ink-muted ml-2">ROSTER ID: #VRV-88219</span>
                  </div>
                  <div className="text-carbon font-bold">
                    SYNTHETIC SCORE: <span className="text-carbon font-bold">88 / 100</span>
                  </div>
                </div>
                <p className="font-sans text-xs text-ink-muted italic">
                  “Dossier note: Third-party analytics tag deferred via service worker;
                  initial paint returned to sub-1.2s benchmark before monthly client
                  review.”
                </p>
              </div>
            </div>

            {/* Frame Footer */}
            <div className="pt-3 border-t border-rule flex items-center justify-between font-mono text-[10px] text-ink-muted">
              <span>ZERO RUNTIME OVERHEAD ON CLIENT ORIGIN</span>
              <span>SYNCHRONIZED SWEEPS: 15-MINUTE CADENCE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
