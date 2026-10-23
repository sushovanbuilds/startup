import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google';
import './globals.css';

// Self-hosted via next/font: binaries are vendored into the build, no runtime CDN.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-display',
});

// Geist is not in next 14.2's bundled next/font data; Inter is the closest
// self-hostable grotesque stand-in (recorded in docs/HANDOFF.md).
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'SiteHealth — Website Health Monitoring for Agencies',
  description:
    'SiteHealth runs automated speed, SEO, and security-posture checks on your client roster, turning website health into branded monthly retainer reports.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'SiteHealth — Website Health Monitoring for Agencies',
    description:
      'Automated Core Web Vitals, SEO, and security-posture monitoring for agency client rosters, delivered as white-labeled client reports.',
    type: 'website',
    siteName: 'SiteHealth',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'SiteHealth — Website Health Monitoring for Agencies',
    description:
      'Automated Core Web Vitals, SEO, and security-posture monitoring for agency client rosters.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
