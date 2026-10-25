/**
 * Portal — announcements & seasons: network directives, advisories, events
 * (with RSVP), and the engagement calendar.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { rsvp } from '@/lib/portal-actions';
import { NTR_FACTS } from '@/facts';
import { getPortalLang, t } from '@/lib/portal-lang';

export const dynamic = 'force-dynamic';

const KIND_STYLE: Record<string, string> = {
  DIRECTIVE: 'border-brand-200 bg-brand-50 text-brand-700',
  ADVISORY: 'border-gold-300 bg-gold-50 text-gold-700',
  EVENT: 'border-mint-300 bg-mint-100 text-mint-700',
  SEASON: 'border-line bg-mist text-muted',
};

/** Arabic rendering of the engagement calendar (EN lives in NTR_FACTS). */
const SEASON_AR: Record<string, { period: string; focus: string }> = {
  'Jan–Mar': { period: 'يناير إلى مارس', focus: 'نوافذ تجديد الفنادق والمكاتب: جمع السجاد المُزال، وحملة تسجيل مع شركات إدارة المرافق' },
  'Ramadan': { period: 'رمضان', focus: 'ذروة التبرع: حملات التبرع بالملابس مع الجمعيات الخيرية، وزيادة طاقة الجمع' },
  'Sep–Oct': { period: 'سبتمبر إلى أكتوبر', focus: 'استرجاع الأزياء المدرسية مع العودة إلى المدارس، وموسم التجهيزات في دبي: انضمام المقاولين ومركّبي السجاد' },
  'Nov–Dec': { period: 'نوفمبر إلى ديسمبر', focus: 'موسم الفعاليات: استعادة سجاد الفعاليات واللافتات والعشب الصناعي، والتكريم السنوي وترتيب الإمارات' },
};

export default async function NewsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const announcements = await prisma.announcement.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 20,
    include: { rsvps: { where: { partnerId: partner.id } } },
  });

  const KIND_LABEL: Record<string, string> = {
    DIRECTIVE: t(lang, 'Directive', 'توجيه'),
    ADVISORY: t(lang, 'Advisory', 'إرشاد'),
    EVENT: t(lang, 'Event', 'فعالية'),
    SEASON: t(lang, 'Season', 'موسم'),
  };

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Announcements', 'الإعلانات')}
        </h1>
        <p className="text-sm text-muted">
          {t(lang, 'Network directives, advisories and invitations.', 'توجيهات الشبكة وإرشاداتها ودعواتها.')}
        </p>
      </header>

      <div className="space-y-3">
        {announcements.length === 0 && (
          <p className="fade-up fade-up-1 text-sm text-muted">{t(lang, 'No announcements yet.', 'لا إعلانات بعد.')}</p>
        )}
        {announcements.map((a, i) => {
          const myRsvp = a.rsvps[0];
          const title = lang === 'ar' ? a.titleAr : a.titleEn;
          const title2 = lang === 'ar' ? a.titleEn : a.titleAr;
          const body = lang === 'ar' ? a.bodyAr : a.bodyEn;
          return (
            <article
              key={a.id}
              className="fade-up rounded-2xl border border-line bg-white p-5 shadow-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${KIND_STYLE[a.kind] ?? ''}`}>
                  {KIND_LABEL[a.kind] ?? a.kind}
                </span>
                <span className="text-[11px] text-muted">{a.publishedAt.toISOString().slice(0, 10)}</span>
                {a.eventDate && (
                  <span className="text-[11px] text-muted">
                    · {t(lang, 'event', 'الفعالية')} {a.eventDate.toISOString().slice(0, 10)}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-base font-semibold text-ink">{title}</h2>
              <div className="text-sm text-brand-700" dir={lang === 'ar' ? 'ltr' : 'rtl'} lang={lang === 'ar' ? 'en' : 'ar'}>{title2}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>

              {a.rsvpEnabled && (
                <div className="mt-3 flex items-center gap-2">
                  {myRsvp ? (
                    <span className="text-xs text-mint-700">
                      ✓ {myRsvp.attending ? t(lang, 'Attending. See you there', 'سنحضر. نراكم هناك') : t(lang, 'Declined', 'اعتذرتم')}
                    </span>
                  ) : (
                    <>
                      <form action={rsvp}>
                        <input type="hidden" name="announcementId" value={a.id} />
                        <input type="hidden" name="attending" value="yes" />
                        <button className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600">
                          {t(lang, 'Attend', 'سنحضر')}
                        </button>
                      </form>
                      <form action={rsvp}>
                        <input type="hidden" name="announcementId" value={a.id} />
                        <input type="hidden" name="attending" value="no" />
                        <button className="rounded-lg border border-line px-4 py-2 text-xs text-muted hover:text-ink">
                          {t(lang, "Can't attend", 'لن نتمكن من الحضور')}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Engagement calendar */}
      <section className="fade-up fade-up-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="section-rule" aria-hidden />
        <h2 className="text-base font-semibold text-brand-800">{t(lang, 'The recovery year', 'سنة الاستعادة')}</h2>
        <p className="mt-1 text-xs text-muted">
          {t(lang, 'When loads move in the UAE, and what the network focuses on in each window.', 'متى تتحرك الحمولات في الإمارات، وما تركز عليه الشبكة في كل فترة.')}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {NTR_FACTS.engagement.seasonalCalendar.map((s) => {
            const arRow = SEASON_AR[s.period];
            return (
              <div key={s.period} className="rounded-xl border border-line p-3">
                <div className="text-sm font-medium text-ink">{lang === 'ar' && arRow ? arRow.period : s.period}</div>
                <div className="text-xs leading-relaxed text-muted">{lang === 'ar' && arRow ? arRow.focus : s.focus}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
