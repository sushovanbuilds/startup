import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureSpread } from '@/components/landing/FeatureSpread';
import { ChangesDark } from '@/components/landing/ChangesDark';
import { AgencyBand } from '@/components/landing/AgencyBand';
import { Pricing } from '@/components/landing/Pricing';
import { CtaScan } from '@/components/landing/CtaScan';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-carbon focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-wider focus:text-white"
      >
        Skip to main content
      </a>
      <Nav />
      <main id="main-content" className="w-full pt-14">
        <Hero />
        <HowItWorks />
        <FeatureSpread />
        <ChangesDark />
        <AgencyBand />
        <Pricing />
        <CtaScan />
      </main>
      <Footer />
    </>
  );
}
