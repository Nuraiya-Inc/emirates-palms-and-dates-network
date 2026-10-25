/**
 * Portal — applications: awards, honors, incentive programs, media mentions.
 * Structured submissions that land in the network's review queue with status
 * tracking. Every decision is made by network officials.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { submitApplication } from '@/lib/portal-actions';
import { getPortalLang, t } from '@/lib/portal-lang';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-brand-50 text-brand-600 border-brand-200',
  UNDER_REVIEW: 'bg-gold-50 text-gold-700 border-gold-300',
  APPROVED: 'bg-mint-100 text-mint-700 border-mint-300',
  DECLINED: 'bg-mist text-muted border-line',
};

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({
    where: { userId: session.user.id },
    include: { applications: { orderBy: { createdAt: 'desc' } } },
  });
  if (!partner) redirect('/dashboard');

  const KIND_LABELS: Record<string, { label: string; hint: string }> = {
    AWARD: { label: t(lang, 'Award · جائزة', 'جائزة · Award'), hint: t(lang, 'Network recovery awards and diversion recognition', 'جوائز الاستعادة في الشبكة وتقدير التحويل') },
    HONOR: { label: t(lang, 'Honor / Recognition · تكريم', 'تكريم · Honor'), hint: t(lang, 'Ceremonial recognition, founding-partner honors', 'تكريم احتفالي، تكريم الشركاء المؤسسين') },
    GRANT: { label: t(lang, 'Incentive / Support · دعم', 'دعم · Support'), hint: t(lang, 'Incentive programs, take-back pilots, equipment support', 'برامج الحوافز، برامج الاسترجاع التجريبية، دعم المعدات') },
    MENTION: { label: t(lang, 'Media mention · ذكر إعلامي', 'ذكر إعلامي · Media mention'), hint: t(lang, 'Feature your operation in network channels and media', 'إبراز منشأتكم في قنوات الشبكة ووسائل الإعلام') },
  };

  const STATUS_LABEL: Record<string, string> = {
    SUBMITTED: t(lang, 'Submitted', 'مُقدَّم'),
    UNDER_REVIEW: t(lang, 'Under review', 'قيد المراجعة'),
    APPROVED: t(lang, 'Approved', 'موافق عليه'),
    DECLINED: t(lang, 'Declined', 'مرفوض'),
  };

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Applications', 'الطلبات')}
        </h1>
        <p className="text-sm text-muted">
          {t(
            lang,
            'Membership standing strengthens every application. Certified and Elite Recovery Partners receive priority consideration.',
            'مكانة العضوية تقوّي كل طلب. شركاء الاستعادة المعتمدون والنخبة يحظون بأولوية النظر.',
          )}
        </p>
      </header>

      {/* New application */}
      <section className="fade-up fade-up-1 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-brand-800">{t(lang, 'New application', 'طلب جديد')}</h2>
        <form action={submitApplication} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Type', 'النوع')}
            </label>
            <select name="kind" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:max-w-sm">
              {Object.entries(KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">
              {Object.values(KIND_LABELS).map((v) => v.hint).join(' · ')}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Title', 'العنوان')}
            </label>
            <input
              name="title" required
              placeholder={t(lang, 'Application for the Diversion Excellence award', 'طلب جائزة التميز في التحويل')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Your case', 'مبرراتكم')}
            </label>
            <textarea
              name="body" rows={5} required
              placeholder={t(
                lang,
                'Tell the network why: tonnes diverted, programs you run, what makes your operation stand out. Noura can help you draft this in chat.',
                'أخبروا الشبكة لماذا: الأطنان المحوَّلة، البرامج التي تديرونها، ما يميز منشأتكم. نورة تساعدكم في الصياغة في المحادثة.',
              )}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600">
            {t(lang, 'Submit to the network', 'إرسال إلى الشبكة')}
          </button>
        </form>
      </section>

      {/* History */}
      <section className="fade-up fade-up-2 space-y-3">
        <h2 className="text-base font-semibold text-brand-800">{t(lang, 'Your applications', 'طلباتكم')}</h2>
        {partner.applications.length === 0 && (
          <p className="text-sm text-muted">{t(lang, 'No applications yet.', 'لا طلبات بعد.')}</p>
        )}
        {partner.applications.map((a) => (
          <div key={a.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {KIND_LABELS[a.kind]?.label ?? a.kind} · {t(lang, 'submitted', 'قُدِّم في')} {a.createdAt.toISOString().slice(0, 10)}
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[a.status] ?? ''}`}>
                {STATUS_LABEL[a.status] ?? a.status.replace('_', ' ')}
              </span>
            </div>
            {a.decisionNote && (
              <p className="mt-2 rounded-lg bg-mist p-3 text-xs leading-relaxed text-muted">
                {a.decisionNote}
              </p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
