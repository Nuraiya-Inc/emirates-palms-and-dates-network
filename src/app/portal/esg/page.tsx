/**
 * Portal — Sustainability: the partner's estimated climate contribution.
 *
 * Everything here is INDICATIVE and labeled as such (hard rule NTR-7 /
 * esg.factorCaveat). Diversion rate = tonnes that reached a diverted fate
 * (NTR_FACTS.taxonomy.divertedFates) over all tonnes logged, landfill and
 * incineration included. The point is motivation plus an auditable record.
 */

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { partnerEsgEstimate, partnerEsgScore, UAE_NET_ZERO_TARGET_YEAR } from '@/lib/esg';
import { NTR_FACTS } from '@/facts';
import { getPortalLang, t } from '@/lib/portal-lang';
import { STREAM_LABELS, FATE_LABELS, one } from '../portal-labels';
import type { WasteFate, WasteStream } from '@prisma/client';
import IndicativeChip from '@/components/IndicativeChip';

/** Small SVG score ring (0–100). */
function ScoreRing({ score }: { score: number }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const filled = (C * score) / 100;
  const color = score >= 80 ? '#2E9E7E' : score >= 60 ? '#35C4A0' : score >= 35 ? '#D9B36C' : '#9AA6A3';
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`ESG score ${score}`}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${C}`} transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="#121829">{score}</text>
      <text x="60" y="78" textAnchor="middle" fontSize="11" fill="#6E7A78">/ 100</text>
    </svg>
  );
}

export const dynamic = 'force-dynamic';

const FACTOR = NTR_FACTS.esg.indicativeFactorTCO2ePerTon;
const DIVERTED = NTR_FACTS.taxonomy.divertedFates as readonly string[];
const NATIONAL_LANDFILL_PCT = Math.round(NTR_FACTS.baseline.nationalTotals.landfillShare * 100);

export default async function EsgPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const year = new Date().getUTCFullYear();
  const [current, previous, esg, fateRows] = await Promise.all([
    partnerEsgEstimate(partner.id, year),
    partnerEsgEstimate(partner.id, year - 1),
    partnerEsgScore(partner.id),
    prisma.wasteRecord.groupBy({
      by: ['fate'],
      where: { report: { partnerId: partner.id, status: 'APPROVED', year } },
      _sum: { tons: true },
    }),
  ]);

  const hasData = current.totalWasteTons > 0 || previous.totalWasteTons > 0;

  // Fate ledger — every fate counted, landfill included.
  const fates = fateRows
    .map((r) => ({ fate: r.fate as WasteFate, tons: Math.round((r._sum.tons ?? 0) * 10) / 10 }))
    .filter((r) => r.tons > 0)
    .sort((a, b) => b.tons - a.tons);
  const fateTotal = fates.reduce((a, r) => a + r.tons, 0);

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Sustainability', 'الاستدامة')}
        </h1>
        <p className="text-sm text-muted">
          {t(
            lang,
            'Your measured contribution to landfill diversion and the UAE climate goals, built from your approved diversion reports.',
            'مساهمتكم المقاسة في التحويل عن المكب وأهداف الإمارات المناخية، مبنية على تقارير التحويل المعتمدة.',
          )}
        </p>
      </header>

      {/* Contribution hero */}
      <section className="fade-up fade-up-1 relative overflow-hidden rounded-2xl p-6 text-white shadow-card-hover sm:p-8"
        style={{ background: 'linear-gradient(135deg, #1F2A44 0%, #2E5A6B 55%, #2E9E7E 100%)' }}>
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
            {t(lang, `${year} estimated climate contribution · indicative`, `المساهمة المناخية التقديرية ${year} · استرشادية`)}
          </div>
          <div className="mt-2 text-5xl font-semibold tracking-tight">
            {current.estAvoidedTCO2e.toLocaleString('en-US')}
            <span className="mx-2 text-xl font-normal text-white/75">
              {t(lang, 'tCO₂e avoided (est.)', 'طن مكافئ CO₂ متجنَّب (تقديري)')}
            </span>
          </div>
          <div className="mt-2 text-sm text-white/80">
            {t(
              lang,
              `${current.divertedTons.toLocaleString('en-US')} tonnes diverted from landfill and incineration`,
              `${current.divertedTons.toLocaleString('en-US')} طن حُوِّلت عن المكب والحرق`,
            )}
            {current.carYearEquivalent > 0 &&
              t(
                lang,
                `, roughly ${current.carYearEquivalent.toLocaleString('en-US')} passenger car${current.carYearEquivalent === 1 ? '' : 's'} off the road for a year`,
                `، أي ما يعادل تقريبًا ${current.carYearEquivalent.toLocaleString('en-US')} سيارة خارج الطريق لسنة`,
              )}
          </div>
          {previous.estAvoidedTCO2e > 0 && (
            <div className="mt-1 text-xs text-white/60">
              {year - 1}: {previous.estAvoidedTCO2e.toLocaleString('en-US')} tCO₂e ({t(lang, 'est.', 'تقديري')})
            </div>
          )}
        </div>
      </section>

      {/* ESG score */}
      {esg.band !== 'No data' && (
        <section className="fade-up fade-up-1 grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center justify-center">
            <ScoreRing score={esg.score} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold text-brand-800">{t(lang, 'ESG Score', 'مؤشر الاستدامة')}</h2>
              <span className="rounded-full bg-mint-100 px-2 py-0.5 text-xs font-semibold text-mint-700">
                {lang === 'ar' ? esg.bandAr : esg.band}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {t(lang, 'An indicative, transparent composite of what you can control.', 'مؤشر تقديري وشفاف لما هو تحت سيطرتكم.')}
            </p>
            <div className="mt-3 space-y-2">
              {[
                { label: t(lang, 'Diversion', 'التحويل'), val: esg.components.diversion, max: 50 },
                { label: t(lang, 'Consistency', 'الانتظام'), val: esg.components.consistency, max: 30 },
                { label: t(lang, 'Data quality', 'جودة البيانات'), val: esg.components.dataQuality, max: 20 },
              ].map((c) => (
                <div key={c.label}>
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="text-ink">{c.label}</span>
                    <span className="tabular-nums text-muted">{c.val}/{c.max}</span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-mist">
                    <div className="viz-grow h-full rounded-full bg-brand-600" style={{ width: `${(c.val / c.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {t(lang, `Reported ${esg.quartersReported}/4 recent quarters`, `أبلغتم عن ${esg.quartersReported}/4 أرباع أخيرة`)}
              {esg.diversionRatePct !== null && ` · ${esg.diversionRatePct}% ${t(lang, 'diversion', 'تحويل')}`}
              {esg.meanConfidence !== null && ` · ${esg.meanConfidence}% ${t(lang, 'data confidence', 'ثقة البيانات')}`}.
              {' '}
              {t(lang, 'Every quarter you report and every tonne you divert raises this.', 'كل ربع تبلغون عنه وكل طن تحوّلونه يرفع هذا المؤشر.')}
            </p>
          </div>
        </section>
      )}

      {/* Net Zero 2050 contribution */}
      <section className="fade-up fade-up-1 rounded-2xl border border-gold-300 bg-gold-50 p-5">
        <h2 className="text-base font-semibold text-brand-800">
          {t(lang, `Your contribution to UAE Net Zero ${UAE_NET_ZERO_TARGET_YEAR}`, `مساهمتكم في الحياد المناخي للإمارات ${UAE_NET_ZERO_TARGET_YEAR}`)}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t(
            lang,
            `Your ${year} estimate of ${current.estAvoidedTCO2e.toLocaleString('en-US')} tCO₂e avoided is part of the national journey to net zero by ${UAE_NET_ZERO_TARGET_YEAR} and to a counted, diverted textile stream. It is an indicative, auditable record, not an offset or a credit, and it is yours to show.`,
            `تقديركم لسنة ${year} البالغ ${current.estAvoidedTCO2e.toLocaleString('en-US')} طن مكافئ متجنَّب جزء من المسيرة الوطنية نحو الحياد المناخي بحلول ${UAE_NET_ZERO_TARGET_YEAR} ونحو تيار نسيجي مُحصى ومُحوَّل. إنه سجل تقديري قابل للتدقيق، وليس تعويضًا ولا رصيدًا كربونيًا، وهو لكم لتعرضوه.`,
          )}
        </p>
      </section>

      {!hasData && (
        <section className="fade-up fade-up-2 rounded-2xl border border-dashed border-line bg-white p-6 text-center">
          <p className="text-sm text-ink">
            {t(lang, 'Your sustainability record starts with your first approved diversion report.', 'سجل استدامتكم يبدأ بأول تقرير تحويل معتمد.')}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t(
              lang,
              'Log where every load actually went. Reuse, donation, recycling, downcycling and export count as diverted. Landfill is logged too, with its reason.',
              'سجّلوا الوجهة الفعلية لكل حمولة. إعادة الاستخدام والتبرع والتدوير والتدوير التنازلي والتصدير تُحتسب تحويلًا. والمكب يُسجَّل أيضًا مع سببه.',
            )}
          </p>
          <Link
            href="/portal/chat"
            className="mt-4 inline-block rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            {t(lang, 'Report with Noura →', '← أبلغوا مع نورة')}
          </Link>
        </section>
      )}

      {/* Diversion by stream */}
      {current.byStream.length > 0 && (
        <section className="fade-up fade-up-2 rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-brand-800">
            {t(lang, `${year} diversion by stream`, `التحويل حسب التيار ${year}`)}
          </h2>
          <div className="space-y-3">
            {current.byStream.map((s) => {
              const max = current.byStream[0].divertedTons;
              const label = STREAM_LABELS[s.stream as WasteStream];
              return (
                <div key={s.stream}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink">{label ? one(lang, label) : s.stream}</span>
                    <span className="tabular-nums text-muted">
                      {s.divertedTons} {t(lang, 't', 'طن')} → ~{s.estAvoidedTCO2e} tCO₂e
                    </span>
                  </div>
                  <div className="h-[8px] overflow-hidden rounded-full bg-mist">
                    <div
                      className="viz-grow h-full rounded-full bg-mint-500"
                      style={{ width: `${Math.max((s.divertedTons / max) * 100, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {current.diversionRatePct !== null && (
            <p className="mt-4 text-xs text-muted">
              {t(lang, 'Your diversion rate: ', 'معدل التحويل لديكم: ')}
              <span className="font-semibold text-mint-700">{current.diversionRatePct}%</span>
              {t(
                lang,
                `. Nationally about ${NATIONAL_LANDFILL_PCT}% of textile waste is reported to go to landfill (reported June 2026, approximate). Verified diversion counts toward Certified and Elite standing.`,
                `. على المستوى الوطني يُذكر أن نحو ${NATIONAL_LANDFILL_PCT}% من النفايات النسيجية تذهب إلى المكب (رقم مُعلن في يونيو 2026، تقريبي). التحويل الموثّق يُحتسب لمستويي الشريك المعتمد والنخبة.`,
              )}
            </p>
          )}
        </section>
      )}

      {/* Fate ledger — every fate counted */}
      {fates.length > 0 && (
        <section className="fade-up fade-up-2 rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="text-base font-semibold text-brand-800">
            {t(lang, `${year} fate ledger`, `سجل المآلات ${year}`)}
          </h2>
          <p className="mt-1 mb-4 text-xs text-muted">
            {t(
              lang,
              'Every tonne has a logged fate, landfill included. The diversion number is only credible because the non-diverted tonnes are counted too.',
              'لكل طن مآل مسجَّل، بما في ذلك المكب. رقم التحويل موثوق لأن الأطنان غير المحوَّلة محسوبة أيضًا.',
            )}
          </p>
          <div className="space-y-2">
            {fates.map((r) => {
              const diverted = DIVERTED.includes(r.fate);
              return (
                <div key={r.fate} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-ink">
                    <i className={`h-2.5 w-2.5 rounded-[3px] ${diverted ? 'bg-mint-500' : 'bg-gold-600'}`} />
                    {one(lang, FATE_LABELS[r.fate])}
                  </span>
                  <span className="tabular-nums text-muted">
                    {r.tons} {t(lang, 't', 'طن')} · {fateTotal > 0 ? Math.round((r.tons / fateTotal) * 100) : 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Annual statement + credit pathway */}
      <section className="fade-up fade-up-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="text-base font-semibold text-brand-800">
          {t(lang, 'Annual Sustainability Contribution Statement', 'بيان المساهمة السنوي في الاستدامة')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t(
            lang,
            "At each year's close, the network issues you a formal statement of your estimated contribution: your diverted tonnage, estimated avoided emissions and your standing in the network. It carries the network's mark and belongs in your organisation's ESG records.",
            'في نهاية كل سنة تصدر لكم الشبكة بيانًا رسميًا بمساهمتكم التقديرية: الأطنان المحوَّلة والانبعاثات المتجنَّبة تقديريًا ومكانتكم في الشبكة. يحمل علامة الشبكة ومكانه في سجلات الاستدامة لدى منشأتكم.',
          )}
        </p>
        <h3 className="mt-4 text-sm font-semibold text-brand-800">{t(lang, 'About carbon credits', 'عن أرصدة الكربون')}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t(
            lang,
            NTR_FACTS.esg.creditPathway,
            'التقديرات ليست أرصدة كربونية. استراتيجية الإمارات للحياد المناخي 2050 وقانون المناخ الاتحادي لسنة 2024 يؤسسان للمحاسبة الكربونية الوطنية، وتستضيف أبوظبي بنية تحتية لأسواق الكربون. دور المنصة هو مجموعة البيانات المقاسة والقابلة للتدقيق التي تتطلبها هذه البرامج، والشركاء أصحاب سجلات التحويل الموثّقة في موقع متقدم للانضمام عند فتح أي برنامج. لا وعود برصيد أو دعم أو عائد.',
          )}
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-mist p-3 text-[11px] leading-relaxed text-muted">
          <IndicativeChip />
          <span>
            {t(
              lang,
              `Methodology note: figures on this page are indicative estimates using a single conservative placeholder factor of ${FACTOR} tCO₂e per productively diverted tonne (avoided landfill methane plus displaced virgin fibre or polymer, versus a landfill baseline). They are not verified carbon accounting and are not tradeable. Stream-specific, methodology-backed factors will be adopted with a qualified carbon consultant before any external claim.`,
              `ملاحظة منهجية: الأرقام في هذه الصفحة تقديرات استرشادية بمعامل واحد متحفظ مؤقت قدره ${FACTOR} طن مكافئ CO₂ لكل طن مُحوَّل إنتاجيًا (ميثان المكب المتجنَّب والألياف أو البوليمر البكر المُستبدل، مقارنة بخط أساس المكب). ليست محاسبة كربونية موثّقة وليست قابلة للتداول. ستُعتمد معاملات خاصة بكل تيار ومدعومة بمنهجية مع مستشار كربون مؤهل قبل أي إعلان خارجي.`,
            )}
          </span>
        </div>
      </section>
    </div>
  );
}
