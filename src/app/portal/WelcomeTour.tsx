'use client';

/**
 * First-visit onboarding tour — a three-step welcome shown once per browser
 * (localStorage flag). Radically short: the goal is to hand the new partner
 * to Noura and the guide, not to explain everything here.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

const FLAG = 'ntr-welcome-v1';

const STEPS = [
  {
    icon: '🧵',
    en: 'Welcome to Naseej',
    ar: 'أهلًا بكم في نسيج',
    body:
      'This is your home on the Naseej Textile Recovery Platform. Your membership, your diversion reports, your certificates and your benefits, all in one place.',
    bodyAr: 'هذه صفحتكم في منصة نسيج لاستعادة المنسوجات: العضوية وتقارير التحويل والشهادات والمزايا في مكان واحد',
  },
  {
    icon: '💬',
    en: 'Noura is your one door',
    ar: 'نورة بابكم الواحد',
    body:
      'The chat button in the corner reaches Noura, the network director. She logs your loads, completes your quarterly diversion report with you, reads any Excel or a photo of your records, and never asks the same question twice.',
    bodyAr: 'زر المحادثة يصلكم بنورة، مديرة الشبكة. تسجّل حمولاتكم وتكمل تقرير التحويل معكم وتقرأ أي ملف أو صورة، ولا تسأل سؤالًا مرتين',
  },
  {
    icon: '🏅',
    en: 'Reporting is how you climb',
    ar: 'التقارير طريق الصعود',
    body:
      'Approved quarterly diversion reports raise your tier: Registered, Active Member, Certified Recovery Partner, Elite Recovery Partner. Higher tiers unlock certificates, verified diversion statements and first access to programs.',
    bodyAr: 'تقارير التحويل المعتمدة ترفع عضويتكم: مسجّل، عضو نشط، شريك استعادة معتمد، شريك استعادة نخبة',
  },
];

export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(FLAG)) setOpen(true);
    } catch {
      /* storage unavailable — skip the tour */
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
         style={{ background: 'rgba(20,28,48,.62)' }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
        <div className="gold-bar" aria-hidden />
        <div className="p-6 text-center sm:p-8">
          <div className="text-4xl">{s.icon}</div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-800">{s.en}</h2>
          <div className="text-brand-700">{s.ar}</div>
          <p className="mt-3 text-sm leading-relaxed text-ink">{s.body}</p>
          <p dir="rtl" className="mt-1 text-sm leading-relaxed text-muted">{s.bodyAr}</p>

          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand-700' : 'w-1.5 bg-line'}`} />
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {last ? (
              <>
                <Link
                  href="/portal/chat"
                  onClick={dismiss}
                  className="rounded-xl bg-brand-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Say hello to Noura · سلّموا على نورة
                </Link>
                <Link
                  href="/portal/guide"
                  onClick={dismiss}
                  className="rounded-xl border border-line px-4 py-3 text-sm font-medium text-brand-800 transition hover:bg-mist"
                >
                  Read the full guide · الدليل الكامل
                </Link>
              </>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-xl bg-brand-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Next · التالي
              </button>
            )}
            <button onClick={dismiss} className="py-1 text-xs text-muted transition hover:text-ink">
              Skip for now · تخطّي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
