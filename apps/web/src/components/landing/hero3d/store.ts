/**
 * Shared hero-plate scroll progress store.
 * LandingMotion (GSAP/ScrollTrigger) writes the hero scrub progress;
 * the three.js scene reads it per frame. Plain module state so the scroll
 * coupling never re-renders React.
 */
let heroProgress = 0;

export function setHeroProgress(progress: number): void {
  heroProgress = progress;
}

export function getHeroProgress(): number {
  return heroProgress;
}
