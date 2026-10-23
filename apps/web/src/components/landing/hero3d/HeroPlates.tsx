'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { PlatesSvg } from '@/components/landing/hero3d/PlatesSvg';

/**
 * Hero plate apparatus mount. The static SVG is the default render, so the
 * page is complete without JS and there is no canvas-related layout shift:
 * the slot keeps one fixed height in every mode. The 3D scene (
 * next/dynamic, ssr:false) only mounts after: intersection, first paint
 * (double-rAF), and capability checks (mobile, reduced-motion, data-saver,
 * slow networks, no-WebGL all stay on the SVG).
 */
const Scene = dynamic(() => import('@/components/landing/hero3d/Scene'), { ssr: false });


function supports3D(): boolean {
  if (window.matchMedia('(max-width: 767px)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return false;
  if (['slow-2g', '2g'].includes(nav.connection?.effectiveType ?? '')) return false;
  try {
    const c = document.createElement('canvas');
    if (!c.getContext('webgl2') && !c.getContext('webgl')) return false;
  } catch {
    return false;
  }
  return true;
}

export function HeroPlates() {
  // 'svg' is the default: no-JS, first paint, and every fallback start here.
  const [mode, setMode] = useState<'svg' | '3d'>('svg');
  const [inView, setInView] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setInView(true);
        }
      },
      { threshold: 0.2 }
    );
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    // Double-rAF: guarantees the first paint is flushed before any WebGL work.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setMode(supports3D() ? '3d' : 'svg');
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [inView]);

  return (
    <div
      ref={wrap}
      className="relative w-full max-w-[520px] mx-auto h-[300px] sm:h-[380px] lg:h-[420px]"
    >
      {mode === 'svg' ? <PlatesSvg /> : <Scene />}
    </div>
  );
}
