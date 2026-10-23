'use client';

import { useEffect } from 'react';
import { setHeroProgress } from '../hero3d/store';

/**
 * Landing motion layer (client-only, progressive enhancement).
 *
 * Everything here animates FROM the server-rendered final state, so the page
 * is complete and identical without JavaScript. All tweens touch
 * transform/opacity only — never layout-triggering properties.
 *
 * - prefers-reduced-motion: reduced -> the effect body never runs
 *   (no Lenis, no parallax, no pinning).
 * - Pinning is desktop-only (>= 1024px), per task spec.
 * - gsap/ScrollTrigger/lenis load as separate chunks via dynamic import; none
 *   of them reaches the initial LCP path.
 * - ScrollTriggers are created inside a gsap.context whose ctx.revert() tears
 *   every tween/trigger down on unmount.
 */
export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all(
        [import('gsap'), import('gsap/ScrollTrigger'), import('lenis')]
      );
      if (disposed) return;

      gsap.registerPlugin(ScrollTrigger);

      // Inertial smooth scrolling, driven by gsap's shared ticker so Lenis and
      // ScrollTrigger run off one rAF loop.
      const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const lenisRaf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(lenisRaf);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        // Hero parallax: headline moved slowest, report mockup fastest,
        // rising to overlap the ruled grid below as the section leaves.
        gsap.to('.motion-hero-headline', {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: {
            trigger: '#scan',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
        gsap.to('.motion-hero-plates', {
          yPercent: -28,
          ease: 'none',
          scrollTrigger: {
            trigger: '#scan',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });

        // Feed the 3D hero (three.js) the hero scrub progress: the Sculpted
        // plates separate vertically with scroll ("exploded view"). Plain
        // module store — no React re-render per frame.
        ScrollTrigger.create({
          trigger: '#scan',
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => setHeroProgress(self.progress),
        });

        // Hairline crosshair marks drift subtly across the whole document.
        gsap.to('.motion-drift', {
          yPercent: -55,
          ease: 'none',
          scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
        });

        // "How it works" numerals reveal in sequence.
        gsap.from('.cadence-numeral', {
          opacity: 0,
          y: 28,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.12,
          scrollTrigger: { trigger: '.cadence-matrix', start: 'top 75%' },
        });

        // Dark ledger section: pinned briefly while the diff list animates in.
        if (window.matchMedia('(min-width: 1024px)').matches) {
          ScrollTrigger.create({
            trigger: '#ledger',
            start: 'top top+=56', // clear the fixed 56px instrument banner
            end: '+=176',
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
          });
        }
        gsap.from('.motion-ledger-row', {
          opacity: 0,
          y: 18,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.15,
          scrollTrigger: { trigger: '#ledger', start: 'top 65%' },
        });

        // Pricing table rows fade up with a small stagger.
        gsap.from('.motion-pricing-row', {
          opacity: 0,
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.09,
          scrollTrigger: { trigger: '#licensure', start: 'top 75%' },
        });
      });

      // Magnetic hover on the primary scan button (fine pointers only).
      const btn = document.querySelector('.motion-magnetic');
      let onMove: ((e: Event) => void) | undefined;
      let onLeave: (() => void) | undefined;
      if (btn && window.matchMedia('(pointer: fine)').matches) {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' });
        onMove = (e) => {
          const me = e as MouseEvent;
          const r = btn.getBoundingClientRect();
          xTo((me.clientX - (r.left + r.width / 2)) * 0.3);
          yTo((me.clientY - (r.top + r.height / 2)) * 0.45);
        };
        onLeave = () => {
          gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
        };
        btn.addEventListener('mousemove', onMove);
        btn.addEventListener('mouseleave', onLeave);
      }

      cleanup = () => {
        ctx.revert(); // kills every tween + ScrollTrigger created above
        if (onMove && btn) btn.removeEventListener('mousemove', onMove);
        if (onLeave && btn) btn.removeEventListener('mouseleave', onLeave);
        gsap.ticker.remove(lenisRaf);
        lenis.destroy();
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return null;
}
