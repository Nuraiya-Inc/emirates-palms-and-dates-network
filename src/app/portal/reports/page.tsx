/**
 * Portal — quarterly diversion reports: the partner's reporting history and
 * the chat-first path to completing the current one.
 */

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getPortalLang, t } from '@/lib/portal-lang';
import { NTR_FACTS } from '@/facts';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-mint-100 text-mint-700 border-mint-300',
  VALIDATED: 'bg-brand-50 text-brand-600 border-brand-200',
  SUBMITTED: 'bg-brand-50 text-brand-600 border-brand-200',
  DRAFT: 'bg-gold-50 text-gold-700 border-gold-300',
  RETURNED: 'bg-gold-100 text-gold-800 border-gold-400',
};

const DIVERTED = NTR_FACTS.taxonomy.divertedFates as readonly string[];

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({
    where: { userId: session.user.id },
    include: {
      reports: {
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
        include: { production: true, wasteRecords: true },
      },
    },
  });
  if (!partner) redirect('/dashboard');

  const STATUS_LABEL: Record<string, string> = {
    APPROVED: t(lang, 'Approved', 'معتمد'),
    VALIDATED: t(lang, 'Validated', 'مُدقّق'),
    SUBMITTED: t(lang, 'Submitted', 'مُقدّم'),
    DRAFT: t(lang, 'Draft', 'مسودة'),
    RETURNED: t(lang, 'Needs clarification', 'بحاجة لتوضيح'),
  };

  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const year = now.getUTCFullYear();
  const hasCurrent = partner.reports.some((r) => r.year === year && r.quarter === q);

  return (
    <div className="space-y-5">
      <header className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-rule" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
            {t(lang, 'Diversion reports', 'تقارير التحويل')}
          </h1>
          <p className="text-sm text-muted">
            {t(
              lang,
              'One report a quarter. Two approved quarters reach Active Member, four reach Certified Recovery Partner.',
              'تقرير واحد كل ربع. ربعان معتمدان يبلغان بكم العضو النشط، وأربعة تبلغان بكم شريك الاستعادة المعتمد.',
            )}
          </p>
        </div>
        <Link
          href="/portal/chat"
          className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          {hasCurrent
            ? t(lang, `Continue Q${q} ${year} with Noura →`, `← أكملوا الربع ${q} ${year} مع نورة`)
            : t(lang, `Start Q${q} ${year} with Noura →`, `← ابدأوا الربع ${q} ${year} مع نورة`)}
        </Link>
      </header>

      <p className="fade-up fade-up-1 rounded-xl border border-line bg-cream px-4 py-3 text-xs leading-relaxed text-muted">
        {t(
          lang,
          'Send Noura your figures any way you like: an Excel file in any layout, a photo of a weighbridge ticket or waste manifest, a voice note, or just a message. She extracts everything, confirms it with you, and returns your emirate benchmark the moment you submit.',
          'أرسلوا الأرقام لنورة كما يناسبكم: ملف إكسل بأي تنسيق، صورة تذكرة الميزان أو بيان النفايات، رسالة صوتية، أو مجرد رسالة. تستخرج كل شيء وتؤكده معكم وتعيد لكم مقارنة إمارتكم لحظة الإرسال.',
        )}
      </p>

      <div className="space-y-3">
        {partner.reports.length === 0 && (
          <div className="fade-up fade-up-2 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
            <div className="text-sm text-ink">
              {t(lang, 'No reports yet. Your first one starts your climb.', 'لا تقارير بعد. أول تقرير يبدأ صعودكم.')}
            </div>
            <div className="mt-1 text-xs text-muted">
              {t(lang, 'Two approved quarters make you an Active Member.', 'ربعان معتمدان يجعلانكم عضوًا نشطًا.')}
            </div>
          </div>
        )}
        {partner.reports.map((r, i) => {
          const logged = r.wasteRecords.reduce((a, w) => a + w.tons, 0);
          const diverted = r.wasteRecords.filter((w) => DIVERTED.includes(w.fate)).reduce((a, w) => a + w.tons, 0);
          const ratePct = logged > 0 ? Math.round((diverted / logged) * 100) : null;
          return (
            <div
              key={r.id}
              className={`fade-up rounded-2xl border border-line bg-white p-4 shadow-card`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-ink">
                    {r.year} · Q{r.quarter}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {r.production?.textileGeneratedTons != null
                      ? t(lang, `${r.production.textileGeneratedTons.toLocaleString('en-US')} t generated or received`, `${r.production.textileGeneratedTons.toLocaleString('en-US')} طن مُنتَج أو مُستلَم`)
                      : t(lang, 'volume not recorded', 'الحجم غير مسجَّل')}
                    {' · '}
                    {logged > 0
                      ? t(lang, `${logged.toLocaleString('en-US')} t logged with a fate`, `${logged.toLocaleString('en-US')} طن مسجَّل بمآل`)
                      : t(lang, 'no loads logged', 'لا حمولات مسجَّلة')}
                    {ratePct !== null && ` · ${ratePct}% ${t(lang, 'diverted', 'مُحوَّل')}`}
                    {r.confidenceScore != null && ` · ${t(lang, 'confidence', 'الثقة')} ${r.confidenceScore}`}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[r.status] ?? ''}`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              {r.status === 'RETURNED' && r.validationNotes && (
                <p className="mt-3 rounded-lg bg-gold-50 p-3 text-xs leading-relaxed text-gold-800">
                  {t(lang, 'Noura has a couple of clarifying questions. ', 'لدى نورة سؤالان للتوضيح. ')}
                  <Link href="/portal/chat" className="underline">
                    {t(lang, 'Continue in chat', 'أكملوا في المحادثة')}
                  </Link>
                  .
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
