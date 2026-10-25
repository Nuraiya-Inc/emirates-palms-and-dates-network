/**
 * Landing page — Naseej Textile Recovery Platform.
 *
 * Public ("/" is allowed in the auth config). Signed-in users go straight to
 * the dashboard. Everyone else gets the short version of what the platform is:
 * one register and one ledger for textile recovery in the UAE.
 *
 * Copy rules (NTR-4, NTR-10): no government affiliation, no "region's first",
 * no invented statistics. The only figures shown come from NTR_FACTS and are
 * labelled as reported, approximate.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { NTR_FACTS } from '@/facts';
import Logo from '@/components/brand/Logo';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    no: '1',
    en: 'Track and trace',
    ar: 'تتبّع',
    body: 'Every participant enrols once and gets a registry number. Every load is logged at removal and graded before it moves: stream, material, backing, weight, contamination, photo.',
  },
  {
    no: '2',
    en: 'Collect',
    ar: 'اجمع',
    body: 'Pickup requests route each load to the haulier, sorter or diversion unit that can take it. Chain of custody is reconciled from source to offtaker.',
  },
  {
    no: '3',
    en: 'Valorize',
    ar: 'استعد القيمة',
    body: 'Loads reach the fate that uses them: reuse, donation, polymer or fibre recycling, downcycling, export. Landfill is still logged, with its reason. The diversion rate is only credible if every load is counted.',
  },
];

export default async function RootPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const t = NTR_FACTS.baseline.nationalTotals;
  const participants = NTR_FACTS.taxonomy.partnerTypes;
  const streams = NTR_FACTS.taxonomy.wasteStreams;

  return (
    <main className="min-h-screen" style={{ background: '#F5F2EC' }}>
      <div className="gold-bar w-full" aria-hidden />

      {/* Hero */}
      <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #141C30, #1F2A44 60%, #2A3A66)' }}>
        <div className="dot-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <Logo variant="light" width={190} />
          <div className="mt-6 text-lg font-medium" dir="rtl" lang="ar">
            منصة نسيج لاستعادة المنسوجات
          </div>
          <h1 className="mt-1 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            One register and one ledger for textile recovery in the UAE.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80">
            Naseej enrols every participant once, logs every textile load at removal, grades it before it
            moves, routes it to the offtaker who can use it, and counts it whatever its fate. Track and
            trace first, collect second, valorize third.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signin" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2A44] hover:bg-white/90">
              Sign in
            </Link>
            <Link href="/showcase" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20">
              Live recovery counter
            </Link>
          </div>
        </div>
      </section>

      {/* Why: the reported national picture */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <Fact value={`~${t.textileWasteTons.toLocaleString('en-US')} t`} label="textile waste per year in the UAE" />
          <Fact value={`~${Math.round(t.landfillShare * 100)}%`} label="of it goes to landfill" />
          <Fact value={`~${(t.textileItemsConsumedPerYear / 1_000_000).toLocaleString('en-US')} M`} label="textile items consumed per year" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Reported, approximate figures from the June 2026 launch coverage of the UAE national textile-circularity
          initiative. Carpet and commercial textiles are not counted separately anywhere today. Counting them is the job.
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-5 pb-10">
        <h2 className="text-lg font-semibold tracking-tight text-brand-800">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.no} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-baseline justify-between">
                <div className="font-semibold text-ink">
                  <span className="mr-2 font-mono text-sm text-gold-600">{s.no}</span>
                  {s.en}
                </div>
                <div className="text-sm text-brand-700" dir="rtl" lang="ar">{s.ar}</div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who takes part */}
      <section className="mx-auto max-w-5xl px-5 pb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-base font-semibold text-brand-800">Who takes part</h2>
            <p className="mt-1 text-xs text-muted">Every participant type enrols on the same register.</p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {participants.map((p) => (
                <li key={p.code} className="flex items-baseline justify-between gap-3 rounded-lg bg-mist px-3 py-2">
                  <span className="text-ink">{p.en}</span>
                  <span className="shrink-0 text-xs text-muted" dir="rtl" lang="ar">{p.ar}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-base font-semibold text-brand-800">What gets logged</h2>
            <p className="mt-1 text-xs text-muted">Textile streams on the ledger.</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {streams.map((w) => (
                <li key={w.code} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 last:border-0">
                  <span className="text-ink">{w.en}</span>
                  <span className="shrink-0 text-xs text-muted" dir="rtl" lang="ar">{w.ar}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What partners get */}
      <section className="mx-auto max-w-5xl px-5 pb-12">
        <div className="rounded-2xl border border-gold-300 bg-gold-50 p-6">
          <h2 className="text-base font-semibold text-brand-800">What partners get</h2>
          <ul className="mt-2 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li>A registry number and a public verification page for their standing.</li>
            <li>A quarterly diversion report, written for them in Arabic and English, with an emirate benchmark.</li>
            <li>A diversion certificate per quarter and a verified diversion statement for ESG reporting once certified.</li>
            <li>Noura, one concierge agent on WhatsApp and in the portal, who never asks twice for the same fact.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signin" className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
              Partner sign in
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] text-muted">
          Naseej Textile Recovery Platform · operated with Nuraiya · anchor processor for carpet and polyolefin fractions: Chemplax.
          An independent partner network aligned with UAE Net Zero 2050 and landfill-diversion goals. Not a government body.
        </p>
      </section>
    </main>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="text-2xl font-semibold tracking-tight text-brand-800">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label} <span className="text-[10px] uppercase tracking-wide">· reported, approx.</span></div>
    </div>
  );
}
