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
    default: 'Emirates Palm & Dates Network',
    template: '%s · Emirates Palm & Dates Network',
  },
  description: 'Emirates Palm & Dates Network — membership, certification, quarterly reporting, and the live UAE date palm data map. Operated with Nuraiya · Technology by Safa BioWorks.',
  applicationName: 'Emirates Palm & Dates Network',
  authors: [{ name: 'Emirates Palm & Dates Network' }],
  themeColor: '#004923',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
