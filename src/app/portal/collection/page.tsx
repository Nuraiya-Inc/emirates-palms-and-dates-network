/**
 * Portal — pickup requests: the two-sided textile recovery market.
 * Sources post a load that is ready to move (stream, estimated tonnes,
 * region, ready-from); recyclers, hauliers, sorters, charities and diversion
 * units in the region claim it. Confirmed pickups write MaterialTransfer
 * edges: chain of custody as a side effect of a useful service.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { createTicket, claimTicket, confirmCollected } from '@/lib/portal-actions';
import { getPortalLang, t } from '@/lib/portal-lang';
import { NTR_FACTS } from '@/facts';
import { STREAM_LABELS, OFFTAKER_TYPES, both, one, regionName } from '../portal-labels';
import type { WasteStream } from '@prisma/client';

export const dynamic = 'force-dynamic';

const STREAM_ORDER = NTR_FACTS.taxonomy.wasteStreams.map((s) => s.code as WasteStream);
const KG_PER_M2 = NTR_FACTS.baseline.validationPriors.carpetKgPerM2Typical;

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const isOfftakerSide = OFFTAKER_TYPES.includes(partner.type);
  const region = regionName(lang, partner.region);

  const [myTickets, regionalOpen] = await Promise.all([
    prisma.collectionTicket.findMany({
      where: { OR: [{ partnerId: partner.id }, { claimedByPartnerId: partner.id }] },
      orderBy: { createdAt: 'desc' },
      include: {
        partner: { select: { nameEn: true, nameAr: true, registryNo: true, city: true } },
        claimedBy: { select: { nameEn: true, nameAr: true, registryNo: true } },
      },
      take: 20,
    }),
    isOfftakerSide
      ? prisma.collectionTicket.findMany({
          where: { status: 'OPEN', region: partner.region, partnerId: { not: partner.id } },
          orderBy: { createdAt: 'desc' },
          include: { partner: { select: { nameEn: true, nameAr: true, city: true } } },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const name = (p: { nameEn: string; nameAr: string | null }) =>
    lang === 'ar' ? (p.nameAr ?? p.nameEn) : p.nameEn;

  const STATUS_LABEL: Record<string, string> = {
    OPEN: t(lang, 'Open', 'مفتوح'),
    CLAIMED: t(lang, 'Claimed', 'تم الحجز'),
    COLLECTED: t(lang, 'Picked up', 'تم الجمع'),
    CANCELLED: t(lang, 'Cancelled', 'ملغى'),
  };

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Pickup requests', 'طلبات الجمع')}
        </h1>
        <p className="text-sm text-muted">
          {t(
            lang,
            `Post a textile load that is ready to move. Registered recyclers, hauliers and sorters in ${region} see it immediately. Every confirmed pickup is logged in the chain of custody.`,
            `اعرضوا حمولة نسيجية جاهزة للنقل. معيدو التدوير والناقلون والفارزون المسجّلون في ${region} يرونها فورًا. كل عملية جمع مؤكدة تُسجَّل في سلسلة الحيازة.`,
          )}
        </p>
      </header>

      {/* New pickup request */}
      <section className="fade-up fade-up-1 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 text-base font-semibold text-brand-800">
          {t(lang, 'Request a pickup', 'طلب جمع حمولة')}
        </h2>
        <p className="mb-4 text-xs text-muted">
          {t(
            lang,
            'Log the load at removal, not later. Noura grades it at intake and routes it by grade.',
            'سجّلوا الحمولة عند الإزالة، لا بعدها. نورة تصنّفها عند الاستلام وتوجّهها حسب الدرجة.',
          )}
        </p>
        <form action={createTicket} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Stream', 'التيار')}
            </label>
            <select name="stream" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
              {STREAM_ORDER.map((k) => (
                <option key={k} value={k}>{both(lang, STREAM_LABELS[k])}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Estimated quantity (tonnes)', 'الكمية التقديرية (طن)')}
            </label>
            <input
              name="estimatedTons" type="number" step="0.1" min="0.1" required placeholder="3.0"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-muted">
              {t(
                lang,
                `Not sure? Carpet runs about ${KG_PER_M2} kg per m² (placeholder prior). Or give bales, rolls or m² in the notes and Noura converts.`,
                `غير متأكدين؟ السجاد يزن نحو ${KG_PER_M2} كجم للمتر المربع (قيمة استرشادية). أو اذكروا عدد البالات أو اللفائف أو المساحة في الملاحظات ونورة تحوّلها.`,
              )}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Ready from', 'جاهزة اعتبارًا من')}
            </label>
            <input
              name="readyFrom" type="date"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'City', 'المدينة')}
            </label>
            <input
              name="city" defaultValue={partner.city ?? ''}
              placeholder={t(lang, 'Dubai Marina', 'مرسى دبي')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Pickup location note', 'ملاحظة موقع الجمع')}
            </label>
            <input
              name="locationNote"
              placeholder={t(lang, 'Loading bay B, basement 2, after 10 pm', 'رصيف التحميل ب، القبو 2، بعد الساعة 10 مساءً')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Notes', 'ملاحظات')}
            </label>
            <input
              name="notes"
              placeholder={t(lang, '120 rolls, nylon 6 tile, dry, palletised, forklift on site', '120 لفة، بلاط نايلون 6، جاف، على منصات، رافعة شوكية متوفرة')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              {t(lang, 'Post pickup request', 'إرسال طلب الجمع')}
            </button>
            <span className="mx-3 text-xs text-muted">{t(lang, 'or just tell Noura in chat', 'أو أخبروا نورة في المحادثة')}</span>
          </div>
        </form>
      </section>

      {/* Open loads nearby — offtaker side */}
      {isOfftakerSide && (
        <section className="fade-up fade-up-2 rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="mb-1 text-base font-semibold text-brand-800">
            {t(lang, 'Open loads in your emirate', 'حمولات متاحة في إمارتكم')}
          </h2>
          <p className="mb-4 text-xs text-muted">
            {t(
              lang,
              `Loads ready for pickup in ${region}. Claiming shares your contact with the source.`,
              `حمولات جاهزة للجمع في ${region}. الحجز يشارك بيانات تواصلكم مع المصدر.`,
            )}
          </p>
          <div className="space-y-2">
            {regionalOpen.length === 0 && (
              <p className="text-sm text-muted">
                {t(lang, 'Nothing open right now. New loads appear here instantly.', 'لا حمولات مفتوحة حاليًا. الحمولات الجديدة تظهر هنا فورًا.')}
              </p>
            )}
            {regionalOpen.map((tk) => (
              <div key={tk.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div>
                  <div className="text-sm font-medium text-ink">
                    {one(lang, STREAM_LABELS[tk.stream])} · {tk.estimatedTons} {t(lang, 't', 'طن')}
                  </div>
                  <div className="text-xs text-muted">
                    {name(tk.partner)}
                    {tk.partner.city ? ` · ${tk.partner.city}` : ''} ·{' '}
                    {tk.createdAt.toISOString().slice(0, 10)}
                    {tk.readyFrom ? ` · ${t(lang, 'ready from', 'جاهزة من')} ${tk.readyFrom.toISOString().slice(0, 10)}` : ''}
                    {tk.locationNote ? ` · ${tk.locationNote}` : ''}
                  </div>
                </div>
                <form action={claimTicket}>
                  <input type="hidden" name="ticketId" value={tk.id} />
                  <button className="rounded-lg bg-mint-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-mint-700">
                    {t(lang, 'Claim this load', 'حجز الحمولة')}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My pickups */}
      <section className="fade-up fade-up-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-brand-800">
          {t(lang, 'Your pickups', 'طلباتكم')}
        </h2>
        <div className="space-y-2">
          {myTickets.length === 0 && (
            <p className="text-sm text-muted">{t(lang, 'No pickup requests yet.', 'لا طلبات جمع بعد.')}</p>
          )}
          {myTickets.map((tk) => {
            const mine = tk.partnerId === partner.id;
            return (
              <div key={tk.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {one(lang, STREAM_LABELS[tk.stream])} · {tk.actualTons ?? tk.estimatedTons} {t(lang, 't', 'طن')}
                      {!mine && (
                        <span className="mx-2 text-xs text-muted">
                          ({t(lang, 'you are collecting', 'أنتم الجهة الجامعة')})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {mine
                        ? tk.claimedBy
                          ? t(lang, `Claimed by ${name(tk.claimedBy)} (${tk.claimedBy.registryNo})`, `حجزها ${name(tk.claimedBy)} (${tk.claimedBy.registryNo})`)
                          : t(lang, 'Waiting for an offtaker', 'بانتظار جهة جامعة')
                        : t(lang, `From ${name(tk.partner)} (${tk.partner.registryNo})`, `من ${name(tk.partner)} (${tk.partner.registryNo})`)}
                      {' · '}
                      {tk.createdAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        tk.status === 'OPEN'
                          ? 'border-brand-200 bg-brand-50 text-brand-600'
                          : tk.status === 'CLAIMED'
                            ? 'border-gold-300 bg-gold-50 text-gold-700'
                            : tk.status === 'COLLECTED'
                              ? 'border-mint-300 bg-mint-100 text-mint-700'
                              : 'border-line bg-mist text-muted'
                      }`}
                    >
                      {STATUS_LABEL[tk.status] ?? tk.status}
                    </span>
                    {tk.status === 'CLAIMED' && (
                      <form action={confirmCollected} className="flex items-center gap-1.5">
                        <input type="hidden" name="ticketId" value={tk.id} />
                        <input
                          name="actualTons" type="number" step="0.1" min="0"
                          placeholder={`${tk.estimatedTons}`}
                          className="w-20 rounded-lg border border-line px-2 py-1.5 text-xs"
                          title={t(lang, 'Actual tonnes picked up', 'الوزن الفعلي المجموع بالطن')}
                        />
                        <button className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                          {t(lang, 'Confirm pickup', 'تأكيد الجمع')}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
