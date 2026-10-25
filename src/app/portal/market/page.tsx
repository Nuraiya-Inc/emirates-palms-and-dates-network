/**
 * Portal — spot marketplace (matchmaking only, no payments in v1).
 * Textile loads, fibre feedstock and recycled products listed member to
 * member; interested partners raise a hand and network-verified contact
 * details are exchanged.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { createListing, expressInterest, closeListing } from '@/lib/portal-actions';
import { getPortalLang, t } from '@/lib/portal-lang';
import { CATEGORY_LABELS, both, one, regionName } from '../portal-labels';
import type { ListingCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CATEGORY_ORDER: ListingCategory[] = [
  'CARPET_PI',
  'CARPET_PC',
  'APPAREL',
  'HOSPITALITY_TEXTILE',
  'TECHNICAL_TEXTILE',
  'FIBER_FEEDSTOCK',
  'RECYCLED_PRODUCTS',
  'OTHER',
];

export default async function MarketPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const [listings, mine] = await Promise.all([
    prisma.listing.findMany({
      where: { status: 'ACTIVE', partnerId: { not: partner.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        partner: { select: { nameEn: true, nameAr: true, region: true, tier: true } },
        interests: { where: { partnerId: partner.id }, select: { id: true } },
      },
      take: 30,
    }),
    prisma.listing.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      include: {
        interests: {
          include: { partner: { select: { nameEn: true, nameAr: true, registryNo: true, contactPhone: true, contactEmail: true } } },
        },
      },
      take: 10,
    }),
  ]);

  const name = (p: { nameEn: string; nameAr: string | null }) =>
    lang === 'ar' ? (p.nameAr ?? p.nameEn) : p.nameEn;

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Marketplace', 'السوق')}
        </h1>
        <p className="text-sm text-muted">
          {t(
            lang,
            'Textile loads, fibre feedstock and recycled products, member to member. The network verifies identities; the transaction itself stays between you.',
            'حمولات نسيجية وألياف خام ومنتجات معاد تدويرها، من عضو إلى عضو. الشبكة تتحقق من الهويات، والصفقة نفسها تبقى بينكم.',
          )}
        </p>
      </header>

      {/* New listing */}
      <section className="fade-up fade-up-1 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-brand-800">
          {t(lang, 'List something', 'عرض للبيع')}
        </h2>
        <form action={createListing} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Title', 'العنوان')}
            </label>
            <input
              name="title" required
              placeholder={t(lang, 'Nylon 6 carpet tile, clean, 8 tonnes, palletised', 'بلاط سجاد نايلون 6، نظيف، 8 طن، على منصات')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Category', 'الفئة')}
            </label>
            <select name="category" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
              {CATEGORY_ORDER.map((k) => (
                <option key={k} value={k}>{both(lang, CATEGORY_LABELS[k])}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
                {t(lang, 'Qty (tonnes)', 'الكمية (طن)')}
              </label>
              <input name="qtyTons" type="number" step="0.1" placeholder="8.0"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
                {t(lang, 'Asking (AED)', 'السعر المطلوب (درهم)')}
              </label>
              <input name="askPriceAed" type="number" step="1" placeholder={t(lang, 'negotiable', 'قابل للتفاوض')}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'Notes', 'ملاحظات')}
            </label>
            <input
              name="notes"
              placeholder={t(lang, 'Material type, backing, contamination, photos available on request', 'نوع المادة، الظهر، درجة التلوث، الصور متاحة عند الطلب')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600">
              {t(lang, 'Publish listing', 'نشر العرض')}
            </button>
          </div>
        </form>
      </section>

      {/* Browse */}
      <section className="fade-up fade-up-2">
        <h2 className="mb-3 text-base font-semibold text-brand-800">
          {t(lang, 'Open listings', 'العروض المفتوحة')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {listings.length === 0 && (
            <p className="text-sm text-muted">{t(lang, 'No open listings right now.', 'لا عروض مفتوحة حاليًا.')}</p>
          )}
          {listings.map((l) => (
            <div key={l.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-ink">{l.title}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {one(lang, CATEGORY_LABELS[l.category])} · {name(l.partner)} · {regionName(lang, l.region)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] text-brand-600">
                  {l.partner.tier}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted">
                {l.qtyTons ? `${l.qtyTons} ${t(lang, 't', 'طن')}` : t(lang, 'quantity on request', 'الكمية عند الطلب')} ·{' '}
                {l.askPriceAed ? `AED ${l.askPriceAed.toLocaleString('en-US')}` : t(lang, 'price negotiable', 'السعر قابل للتفاوض')}
              </div>
              {l.notes && <div className="mt-1 text-xs text-muted">{l.notes}</div>}
              <form action={expressInterest} className="mt-3">
                <input type="hidden" name="listingId" value={l.id} />
                {l.interests.length > 0 ? (
                  <span className="text-xs text-mint-700">
                    ✓ {t(lang, 'Interest sent. The seller sees your contact details', 'تم إرسال اهتمامكم. البائع يرى بيانات تواصلكم')}
                  </span>
                ) : (
                  <button className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-gold-600">
                    {t(lang, "I'm interested", 'مهتم')}
                  </button>
                )}
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* My listings */}
      <section className="fade-up fade-up-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-brand-800">
          {t(lang, 'Your listings', 'عروضكم')}
        </h2>
        <div className="space-y-3">
          {mine.length === 0 && <p className="text-sm text-muted">{t(lang, 'Nothing listed yet.', 'لا عروض بعد.')}</p>}
          {mine.map((l) => (
            <div key={l.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium text-ink">{l.title}</span>
                  <span className="mx-2 text-xs text-muted">
                    {l.status === 'ACTIVE' ? t(lang, 'Active', 'نشط') : t(lang, 'Closed', 'مغلق')}
                  </span>
                </div>
                {l.status === 'ACTIVE' && (
                  <form action={closeListing}>
                    <input type="hidden" name="listingId" value={l.id} />
                    <button className="text-xs text-muted underline hover:text-ink">
                      {t(lang, 'Close listing', 'إغلاق العرض')}
                    </button>
                  </form>
                )}
              </div>
              {l.interests.length > 0 && (
                <div className="mt-2 space-y-1 rounded-lg bg-mist p-2.5 text-xs">
                  <div className="font-medium text-ink">
                    {t(
                      lang,
                      `${l.interests.length} interested member${l.interests.length === 1 ? '' : 's'}:`,
                      `${l.interests.length} من الأعضاء المهتمين:`,
                    )}
                  </div>
                  {l.interests.map((i) => (
                    <div key={i.id} className="text-muted">
                      {name(i.partner)} ({i.partner.registryNo})
                      {i.partner.contactPhone ? ` · ${i.partner.contactPhone}` : ''}
                      {i.partner.contactEmail ? ` · ${i.partner.contactEmail}` : ''}
                      {i.message ? ` · “${i.message}”` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
