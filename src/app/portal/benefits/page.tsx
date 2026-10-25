/**
 * Benefits — the answer to "what's in it for me?", made visual.
 *
 * Every benefit is shown relative to THIS partner's tier: what they already
 * hold (ownership → loss aversion), what the next tier unlocks (aspiration),
 * and the annual renewal contract in plain language. Tier names and
 * earned-by text come from TIER_LADDER.
 */

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { TIER_LADDER } from '@/facts';
import { getPortalLang, t } from '@/lib/portal-lang';

export const dynamic = 'force-dynamic';

const TIER_BENEFITS: Record<string, Array<{ en: string; ar: string }>> = {
  REGISTERED: [
    { en: 'Listing in the Naseej partner registry', ar: 'الإدراج في سجل شركاء نسيج' },
    { en: 'Noura, your network director, 24/7, in Arabic or English', ar: 'نورة، مديرة الشبكة، على مدار الساعة بالعربية أو الإنجليزية' },
    { en: 'Pickup requests, the partner guide and network announcements', ar: 'طلبات الجمع ودليل الشريك وإعلانات الشبكة' },
  ],
  ACTIVE: [
    { en: 'Emirate benchmark after every report: where your diversion rate stands among peers', ar: 'مقارنة الإمارة بعد كل تقرير: أين يقف معدل تحويلكم بين نظرائكم' },
    { en: 'Marketplace access: list loads, find offtakers inside the network', ar: 'الوصول إلى السوق: اعرضوا الحمولات وجدوا المستقبلين داخل الشبكة' },
    { en: 'Member seal and a diversion certificate every quarter', ar: 'ختم العضوية وشهادة تحويل كل ربع' },
  ],
  CERTIFIED: [
    { en: 'Certification mark with annual seal and public QR verification', ar: 'علامة الاعتماد بختم سنوي ورمز تحقق عام' },
    { en: 'Verified diversion statement for your ESG reporting', ar: 'بيان تحويل موثّق لتقارير الاستدامة لديكم' },
    { en: 'Incentive-program eligibility and priority offtaker introductions', ar: 'أهلية برامج الحوافز وأولوية التعريف بالمستقبلين' },
  ],
  ELITE: [
    { en: 'Featured national profile and annual ceremony recognition', ar: 'ملف وطني مميز وتكريم في الحفل السنوي' },
    { en: 'Advisory-council seat', ar: 'مقعد في المجلس الاستشاري' },
    { en: 'First access to stewardship and take-back pilots', ar: 'أولوية الوصول إلى برامج الإشراف والاسترجاع التجريبية' },
  ],
};

const EARNED_BY_AR: Record<string, string> = {
  REGISTERED: 'هوية موثّقة وملف أساسي',
  ACTIVE: 'تقريرا تحويل ربعيان معتمدان متتاليان',
  CERTIFIED: 'أربعة أرباع من التقارير وتدقيق سلسلة الحيازة (كل حمولة متتبعة إلى مآل مسجَّل)',
  ELITE: 'تميّز مستدام ومساهمة في الأهداف الوطنية (جودة البيانات، معدل تحويل موثّق، الإرشاد، برامج الاسترجاع)',
};

export default async function BenefitsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const myOrder = TIER_LADDER.find((tier) => tier.code === partner.tier)?.order ?? 0;
  const year = new Date().getUTCFullYear();

  const instant = [
    ['📊', t(lang, 'Your emirate benchmark', 'مقارنة إمارتكم'), t(lang, 'Where your diversion rate stands among your emirate’s partners, after every single report.', 'أين يقف معدل تحويلكم بين شركاء إمارتكم، بعد كل تقرير.')],
    ['💡', t(lang, 'One practical insight', 'ملاحظة عملية واحدة'), t(lang, 'A concrete, actionable observation from your own figures, every quarter.', 'ملاحظة ملموسة قابلة للتنفيذ من أرقامكم، كل ربع.')],
    ['♻️', t(lang, 'Loads become pickups', 'الحمولات تصبح طلبات جمع'), t(lang, 'Carpet, linen, uniforms or turf posted for pickup or sale the moment you mention them.', 'سجاد أو بياضات أو أزياء موحدة أو عشب صناعي تُعرض للجمع أو البيع لحظة ذكرها.')],
  ];

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-card-hover sm:p-8"
        style={{ background: 'linear-gradient(135deg, #141C30, #1F2A44 60%, #3A3F8F)' }}
      >
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
            {t(lang, 'Member Benefits · مزايا العضوية', 'مزايا العضوية · Member Benefits')}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t(lang, 'What your membership pays you', 'ما تعود به عضويتكم عليكم')}
          </h1>
          <div className="mt-1 text-lg text-white/85">
            {t(lang, 'عضويتكم أصل، وهذه عوائده', 'Your membership is an asset. These are its returns.')}
          </div>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            {t(
              lang,
              'Every quarterly diversion report returns value the same day, and everything below is held by reporting. Green is yours today; locked items show exactly how to earn them.',
              'كل تقرير تحويل ربعي يعيد قيمة في اليوم نفسه، وكل ما يلي يُحفظ بالتقارير. الأخضر لكم اليوم، والمقفل يوضح بالضبط كيف تكسبونه.',
            )}
          </p>
        </div>
      </section>

      {/* Instant returns — what a single report gives back */}
      <section className="grid gap-3 sm:grid-cols-3">
        {instant.map(([icon, title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="text-2xl">{icon}</div>
            <div className="mt-2 font-semibold text-brand-800">{title}</div>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      {/* Tier ladder with lock states */}
      <div className="space-y-4">
        {TIER_LADDER.map((tier) => {
          const unlocked = tier.order <= myOrder;
          const isNext = tier.order === myOrder + 1;
          return (
            <section
              key={tier.code}
              className={`rounded-2xl border p-5 sm:p-6 ${
                unlocked ? 'border-mint-300 bg-white shadow-card' : 'border-line bg-mist/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${unlocked ? '' : 'grayscale'}`}>{unlocked ? '🟢' : '🔒'}</span>
                  <div>
                    <div className={`font-semibold ${unlocked ? 'text-brand-800' : 'text-muted'}`}>
                      {lang === 'ar' ? `${tier.nameAr} · ${tier.nameEn}` : `${tier.nameEn} · ${tier.nameAr}`}
                      {partner.tier === tier.code && (
                        <span className="mx-2 rounded-full bg-mint-100 px-2 py-0.5 text-xs font-medium text-mint-700">
                          {t(lang, 'Your tier', 'مستواكم')}
                        </span>
                      )}
                      {isNext && (
                        <span className="mx-2 rounded-full border border-gold-300 bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-700">
                          {t(lang, 'Next', 'التالي')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {t(lang, `Earned by: ${tier.earnedBy}`, `يُكتسب بـ: ${EARNED_BY_AR[tier.code] ?? tier.earnedBy}`)}
                    </div>
                  </div>
                </div>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {(TIER_BENEFITS[tier.code] ?? []).map((b) => (
                  <li
                    key={b.en}
                    className={`rounded-xl px-3 py-2.5 text-sm ${
                      unlocked ? 'bg-mint-100/50 text-ink' : 'bg-white/60 text-muted'
                    }`}
                  >
                    <div>{lang === 'ar' ? b.ar : b.en}</div>
                    <div className={`text-xs ${unlocked ? 'text-brand-700' : 'text-muted'}`}>{lang === 'ar' ? b.en : b.ar}</div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* The renewal contract, in plain language */}
      <section className="rounded-2xl border border-gold-300 bg-gold-50 p-5 sm:p-6">
        <div className="font-semibold text-gold-700">
          {t(lang, 'The annual seal: how standing stays yours', 'الختم السنوي: كيف تبقى مكانتكم لكم')}
        </div>
        <div className="mt-2 space-y-1.5 text-sm text-gold-700/90">
          <p>◉ {t(lang, `Your certificate carries the ${year} seal. It renews automatically; quarterly diversion reporting is the renewal.`, `شهادتكم تحمل ختم ${year}. تتجدد تلقائيًا، وتقرير التحويل الربعي هو التجديد.`)}</p>
          <p>◉ {t(lang, 'One unreported quarter: a friendly heads-up (At-risk). Nothing is lost yet.', 'ربع واحد بلا تقرير: تنبيه ودّي (معرّض للخطر). لم يُفقد شيء بعد.')}</p>
          <p>◉ {t(lang, 'Two unreported quarters: benefits pause until your record is complete. Your history is never erased.', 'ربعان بلا تقرير: تتوقف المزايا مؤقتًا حتى يكتمل سجلكم. تاريخكم لا يُمحى أبدًا.')}</p>
          <p>◉ {t(lang, 'A full year without an approved report: certification lapses, by official decision. Re-certification is always open.', 'سنة كاملة بلا تقرير معتمد: ينقضي الاعتماد بقرار رسمي. إعادة الاعتماد متاحة دائمًا.')}</p>
          <p className="pt-1 font-medium">
            {t(lang, 'Every one of these reverses the moment you complete your record with Noura. Most partners need less than ten minutes a quarter.', 'كل ذلك ينعكس لحظة إكمال سجلكم مع نورة. معظم الشركاء يحتاجون أقل من عشر دقائق كل ربع.')}
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-line bg-white p-5 text-center text-sm shadow-card">
        {t(lang, 'Ten minutes a quarter keeps all of this yours. ', 'عشر دقائق كل ربع تبقي كل هذا لكم. ')}
        <Link href="/portal/chat" className="font-semibold text-brand-600 underline underline-offset-2">
          {t(lang, 'Start with Noura', 'ابدأوا مع نورة')}
        </Link>
      </div>
    </div>
  );
}
