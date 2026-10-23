import { Download } from 'lucide-react';

/**
 * The archival client dossier (product proof): editorial spec sheet on the
 * left, tangible paper broadside document on the right.
 */
export function FeatureSpread() {
  return (
    <section
      className="w-full bg-paper px-4 sm:px-8 lg:px-12 py-16 border-b border-rule overflow-hidden"
      id="dossier"
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-center">
        {/* Left: Editorial Spec Sheet */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 font-mono text-xs text-carbon font-bold uppercase tracking-wider">
            <span>02 // ARTIFACT SPECIFICATION</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-carbon tracking-tight leading-tight">
            Client reporting elevated to an archival art form.
          </h2>
          <p className="text-[16px] text-ink-muted leading-relaxed">
            Generic SaaS audit dashboards confuse non-technical founders. SiteHealth
            creates high-trust typography broadsheets with human annotations that
            account directors proudly deliver to boardrooms.
          </p>

          {/* Technical Spec Box */}
          <div className="bg-paper-low border border-carbon/20 p-5">
            <div className="font-mono text-xs uppercase text-carbon font-bold border-b border-rule pb-2 mb-3">
              TECHNICAL DOSSIER SPECIFICATION
            </div>
            <dl className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-muted">CANONICAL STANDARD:</dt>
                <dd className="text-carbon font-semibold">PDF/A-2b (Archival ISO 19005-2)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">COLOR PROFILE:</dt>
                <dd className="text-carbon font-semibold">
                  Monochrome Warm Carbon + Signal Orange
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">GENERATION LATENCY:</dt>
                <dd className="text-carbon font-semibold">&lt; 2.8s per 40-domain client bundle</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">AGENCY BRANDING:</dt>
                <dd className="text-carbon font-bold">
                  100% Unbranded · Pure Agency Retainer Asset
                </dd>
              </div>
            </dl>
          </div>

          <div className="pt-2">
            <a
              className="inline-flex items-center gap-2 font-mono text-xs uppercase font-bold text-carbon hover:text-signal-dim transition-colors underline decoration-signal underline-offset-4"
              href="#"
            >
              <span>[ VIEW SAMPLE CLIENT DOSSIER: MERIDIAN_STUDIO_MAY.PDF ]</span>
              <Download className="h-[15px] w-[15px]" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Right: Tangible Paper Broadside Document Proof */}
        <div className="lg:col-span-7 relative">
          <div className="bg-white border-2 border-carbon/30 p-6 sm:p-8 shadow-sm relative">
            {/* Sheet Header */}
            <div className="border-b-2 border-carbon pb-4 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] text-carbon font-bold tracking-widest uppercase block mb-1">
                  MONTHLY INFRASTRUCTURE DOSSIER • MAY 2025
                </span>
                <div className="font-display text-2xl sm:text-3xl text-carbon font-normal">
                  MERIDIAN STUDIO INTERNATIONAL
                </div>
                <div className="font-mono text-[11px] text-ink-muted mt-1">
                  PREPARED BY: VERVE CREATIVE ARCHIVAL RETAINER • REF: #VRV-88219
                </div>
              </div>
              <div className="sm:text-right">
                <span className="font-mono text-[10px] text-ink-muted uppercase block">
                  OVERALL STATUS
                </span>
                <span className="font-display text-2xl text-carbon font-semibold">
                  OPTIMAL // A+
                </span>
              </div>
            </div>

            {/* Triple Benchmark Banner */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 text-center border border-carbon/20 bg-paper-low p-3 font-mono">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-carbon">98 / 100</div>
                <div className="text-[9px] sm:text-[10px] uppercase text-ink-muted mt-0.5">
                  SPEED RUNTIME
                </div>
              </div>
              <div className="border-x border-rule">
                <div className="text-xl sm:text-2xl font-bold text-carbon">100 / 100</div>
                <div className="text-[9px] sm:text-[10px] uppercase text-ink-muted mt-0.5">
                  INDEX INTEGRITY
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-carbon">94 / 100</div>
                <div className="text-[9px] sm:text-[10px] uppercase text-ink-muted mt-0.5">
                  SECURITY POSTURE
                </div>
              </div>
            </div>

            {/* Forensic Metric Table */}
            <table className="w-full text-left font-mono text-[11px] border-collapse mb-5">
              <thead>
                <tr className="border-b border-carbon/20 text-ink-muted">
                  <th className="py-2">AUDIT VECTOR</th>
                  <th className="py-2">MEASURED</th>
                  <th className="py-2 hidden sm:table-cell">SPEC THRESHOLD</th>
                  <th className="py-2 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                <tr>
                  <td className="py-2.5 text-carbon font-semibold">
                    Largest Contentful Paint (LCP)
                  </td>
                  <td className="py-2.5">1.14s</td>
                  <td className="py-2.5 text-ink-muted hidden sm:table-cell">&lt; 2.50s</td>
                  <td className="py-2.5 text-right text-carbon font-bold">NOMINAL</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-carbon font-semibold">
                    Cumulative Layout Shift (CLS)
                  </td>
                  <td className="py-2.5">0.008</td>
                  <td className="py-2.5 text-ink-muted hidden sm:table-cell">&lt; 0.100</td>
                  <td className="py-2.5 text-right text-carbon font-bold">NOMINAL</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-carbon font-semibold">
                    Interaction to Next Paint (INP)
                  </td>
                  <td className="py-2.5">42ms</td>
                  <td className="py-2.5 text-ink-muted hidden sm:table-cell">&lt; 200ms</td>
                  <td className="py-2.5 text-right text-carbon font-bold">NOMINAL</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-carbon font-semibold">
                    Hero Font Asset Optimization
                  </td>
                  <td className="py-2.5">92KB woff2</td>
                  <td className="py-2.5 text-ink-muted hidden sm:table-cell">&lt; 150KB</td>
                  <td className="py-2.5 text-right text-carbon font-bold">REFACTORED</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-carbon font-semibold">
                    TLS Certificate Validity
                  </td>
                  <td className="py-2.5">64 Days left</td>
                  <td className="py-2.5 text-ink-muted hidden sm:table-cell">&gt; 14 Days</td>
                  <td className="py-2.5 text-right text-carbon font-bold">
                    AUTO-RENEW ACTIVE
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Agency Director Note */}
            <div className="bg-paper p-4 border-l-2 border-signal relative font-mono">
              <span className="text-[10px] text-carbon font-bold uppercase tracking-wider block mb-1">
                ¶ AGENCY ACCOUNT LEAD DIRECTIVE:
              </span>
              <p className="font-display italic text-sm text-carbon leading-snug">
                “Notice: Our font-display swap on{' '}
                <code>GT-America-Expanded.woff2</code> shaved 640ms off mobile initial
                paint after the client marketing team embedded hotjar scripts on May
                4. Retainer value reaffirmed.”
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-carbon/20 flex justify-between font-mono text-[9px] text-ink-muted">
              <span>SITEHEALTH ARCHIVAL KERNEL v4.8</span>
              <span>CERTIFIED DISPATCH FOR CLIENT DISTRIBUTION</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
