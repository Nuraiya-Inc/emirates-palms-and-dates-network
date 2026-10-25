import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

/**
 * Inter — the body & UI font across the platform. Loaded via next/font
 * (self-hosted at build, no runtime Google Fonts call → no FOUT).
 * Exposed as a CSS variable so Tailwind's sans family can chain through it.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Naseej Textile Recovery Platform',
    template: '%s · Naseej Textile Recovery Platform',
  },
  description: 'Naseej Textile Recovery Platform: one register and one ledger for textile recovery in the UAE. Membership, chain of custody, quarterly diversion reporting, and the live UAE textile recovery map. Operated with Nuraiya.',
  applicationName: 'Naseej Textile Recovery Platform',
  authors: [{ name: 'Naseej Textile Recovery Platform' }],
  themeColor: '#1F2A44',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
