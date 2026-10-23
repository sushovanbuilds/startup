/**
 * Bottom reconnaissance scan bar (visual only — no API wiring in T1.6a).
 */
export function CtaScan() {
  return (
    <section className="w-full bg-paper px-4 sm:px-8 lg:px-12 py-16 border-b border-rule text-center relative">
      <div className="max-w-2xl mx-auto">
        <div className="inline-block px-2.5 py-0.5 bg-paper-low border border-rule font-mono text-[10px] text-signal font-bold uppercase tracking-widest mb-3">
          INSTANT CLIENT RECONNAISSANCE
        </div>
        <h2 className="font-display text-3xl sm:text-4xl text-carbon tracking-tight mb-3">
          Scan your highest-value client site now.
        </h2>
        <p className="text-ink-muted text-base mb-8">
          Generate an archival health dossier in 45 seconds. Zero registration, zero
          DNS reconfiguration required.
        </p>
        <form className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
          <input
            className="flex-1 bg-white border border-carbon/30 px-4 py-3 font-mono text-xs text-carbon placeholder:text-ink-muted/70 focus:outline-none focus:border-signal"
            placeholder="https://your-client-site.com"
            type="text"
          />
          <button
            className="bg-carbon text-white font-mono text-xs uppercase font-bold tracking-wider px-6 py-3 hover:bg-signal transition-colors shrink-0"
            type="button"
          >
            Commence Scan
          </button>
        </form>
        <div className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mt-4">
          No credit card required · Full 14-day unrestricted agency access
        </div>
      </div>
    </section>
  );
}
