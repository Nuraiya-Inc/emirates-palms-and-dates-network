/**
 * Portal — organisation profile. Extensive but forgiving: everything optional,
 * completeness meter shows what a full record looks like, and Noura can
 * fill any of it conversationally instead.
 *
 * Profile facts live in Partner.profileFacts (JSON). Keys written here:
 *   units_count, floor_area_m2, material_types, streams_handled,
 *   capacity_tpy, certifications, about
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { updateProfile } from '@/lib/portal-actions';
import Link from 'next/link';
import type { PartnerType } from '@prisma/client';
import { getPortalLang, t, type PortalLang } from '@/lib/portal-lang';
import { PARTNER_TYPE_LABELS, PROCESSOR_TYPES, one, regionName } from '../portal-labels';

export const dynamic = 'force-dynamic';

/** What "units" means for each participant type (null = no unit count). */
function unitsLabel(lang: PortalLang, type: PartnerType): { label: string; placeholder: string } | null {
  switch (type) {
    case 'HOSPITALITY':
      return { label: t(lang, 'Rooms (keys)', 'عدد الغرف'), placeholder: '420' };
    case 'FACILITY':
      return { label: t(lang, 'Sites / buildings managed', 'عدد المواقع / المباني'), placeholder: '35' };
    case 'RETAILER':
      return { label: t(lang, 'Stores', 'عدد المتاجر'), placeholder: '12' };
    case 'INSTALLER':
      return { label: t(lang, 'Removal jobs per year', 'أعمال الإزالة سنويًا'), placeholder: '80' };
    case 'MANUFACTURER':
      return { label: t(lang, 'Production sites', 'عدد مواقع الإنتاج'), placeholder: '2' };
    case 'CHARITY':
      return { label: t(lang, 'Collection points', 'عدد نقاط الجمع'), placeholder: '25' };
    case 'HAULIER':
      return { label: t(lang, 'Vehicles', 'عدد المركبات'), placeholder: '8' };
    default:
      return null;
  }
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const facts = (partner.profileFacts as Record<string, unknown> | null) ?? {};
  const f = (k: string) => (facts[k] != null ? String(facts[k]) : '');

  const isProcessor = PROCESSOR_TYPES.includes(partner.type);
  const units = unitsLabel(lang, partner.type);

  const completenessFields = [
    partner.contactName,
    partner.contactPhone || partner.contactEmail,
    partner.city,
    isProcessor ? f('capacity_tpy') : f('units_count') || f('floor_area_m2'),
    f('material_types') || f('streams_handled'),
    f('certifications'),
    f('about'),
  ];
  const complete = completenessFields.filter(Boolean).length;
  const completePct = Math.round((complete / completenessFields.length) * 100);

  const typeLabel = one(lang, PARTNER_TYPE_LABELS[partner.type]);

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Organisation profile', 'ملف المنشأة')}
        </h1>
        <p className="text-sm text-muted">
          <span dir="ltr">{partner.registryNo}</span> ·{' '}
          {t(
            lang,
            'A complete profile strengthens your standing, speeds every application and lets Noura grade and route your loads without asking twice.',
            'الملف المكتمل يقوّي مكانتكم ويسرّع كل طلب ويتيح لنورة تصنيف حمولاتكم وتوجيهها دون أن تسأل مرتين.',
          )}
        </p>
      </header>

      {/* Completeness */}
      <section className="fade-up fade-up-1 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-ink">{t(lang, 'Profile completeness', 'اكتمال الملف')}</span>
          <span className="font-semibold text-brand-700">{completePct}%</span>
        </div>
        <div className="h-[8px] overflow-hidden rounded-full bg-gold-100">
          <div
            className="viz-grow h-full rounded-full bg-gold-500"
            style={{ width: `${Math.max(completePct, 3)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {t(lang, 'Prefer to talk it through? ', 'تفضّلون المحادثة؟ ')}
          <Link href="/portal/chat" className="text-brand-600 underline">
            {t(lang, 'Noura can complete this with you in chat', 'نورة تكمل هذا معكم في المحادثة')}
          </Link>
          {t(lang, ', in Arabic or English.', '، بالعربية أو الإنجليزية.')}
        </p>
      </section>

      {/* The form */}
      <form action={updateProfile} className="fade-up fade-up-2 space-y-5">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-brand-800">{t(lang, 'Identity & contact', 'الهوية والتواصل')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t(lang, 'Registered name', 'الاسم المسجّل')} value={partner.nameEn} readOnly />
            <Field label={t(lang, 'Name in Arabic', 'الاسم بالعربية')} value={partner.nameAr ?? ''} readOnly rtl />
            <Field
              label={t(lang, 'Participant type', 'نوع المشارك')}
              value={`${typeLabel}${partner.subtype ? ` · ${partner.subtype}` : ''}${partner.sizeClass ? ` · ${partner.sizeClass}` : ''}`}
              readOnly
            />
            <Field label={t(lang, 'Emirate', 'الإمارة')} value={regionName(lang, partner.region)} readOnly />
            <Field name="city" label={t(lang, 'City / area', 'المدينة / المنطقة')} defaultValue={partner.city ?? ''} placeholder={t(lang, 'Al Quoz', 'القوز')} />
            <Field name="contactName" label={t(lang, 'Primary contact', 'جهة الاتصال الرئيسية')} defaultValue={partner.contactName ?? ''} placeholder={t(lang, 'Full name', 'الاسم الكامل')} />
            <Field name="contactPhone" label={t(lang, 'WhatsApp / phone', 'واتساب / هاتف')} defaultValue={partner.contactPhone ?? ''} placeholder="+9715…" />
            <Field name="contactEmail" label={t(lang, 'Email', 'البريد الإلكتروني')} defaultValue={partner.contactEmail ?? ''} placeholder="name@example.com" />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
                {t(lang, 'Preferred language', 'اللغة المفضلة')}
              </label>
              <select
                name="preferredLang"
                defaultValue={partner.preferredLang}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="mb-1 text-base font-semibold text-brand-800">
            {isProcessor ? t(lang, 'Processing details', 'تفاصيل المعالجة') : t(lang, 'Operation details', 'تفاصيل التشغيل')}
          </h2>
          <p className="mb-4 text-xs text-muted">
            {isProcessor
              ? t(lang, 'What you accept and how much you can take. Noura routes loads to you by grade, acceptance spec, distance and capacity.', 'ما تقبلونه وكم تستطيعون استلامه. نورة توجّه الحمولات إليكم حسب الدرجة ومواصفات القبول والمسافة والطاقة.')
              : t(lang, 'The size of your footprint helps Noura sanity-check your loads and spot what is missing.', 'حجم نشاطكم يساعد نورة على التحقق من حمولاتكم ورصد ما ينقص.')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {isProcessor ? (
              <>
                <Field name="capacity_tpy" label={t(lang, 'Capacity (tonnes / year)', 'الطاقة (طن / سنة)')} defaultValue={f('capacity_tpy')} placeholder="2000" type="number" />
                <Field name="streams_handled" label={t(lang, 'Streams accepted', 'التيارات المقبولة')} defaultValue={f('streams_handled')} placeholder={t(lang, 'carpet tile, broadloom, turf…', 'بلاط سجاد، لفائف، عشب صناعي…')} />
                <Field name="material_types" label={t(lang, 'Materials accepted', 'المواد المقبولة')} defaultValue={f('material_types')} placeholder={t(lang, 'nylon 6, PP, polyester, cotton…', 'نايلون 6، بولي بروبيلين، بوليستر، قطن…')} />
              </>
            ) : (
              <>
                {units && (
                  <Field name="units_count" label={units.label} defaultValue={f('units_count')} placeholder={units.placeholder} type="number" />
                )}
                <Field name="floor_area_m2" label={t(lang, 'Carpeted / textile floor area (m²)', 'مساحة الأرضيات المفروشة (م²)')} defaultValue={f('floor_area_m2')} placeholder="18000" type="number" />
                <Field name="streams_handled" label={t(lang, 'Streams you generate', 'التيارات التي تنتجونها')} defaultValue={f('streams_handled')} placeholder={t(lang, 'hospitality textiles, carpet tile, uniforms…', 'منسوجات ضيافة، بلاط سجاد، أزياء موحدة…')} />
                <Field name="material_types" label={t(lang, 'Material types', 'أنواع المواد')} defaultValue={f('material_types')} placeholder={t(lang, 'poly-cotton linen, nylon 6 tile, wool broadloom…', 'بياضات بولي قطن، بلاط نايلون 6، لفائف صوف…')} />
              </>
            )}
            <Field name="certifications" label={t(lang, 'Certifications held', 'الشهادات الحاصلون عليها')} defaultValue={f('certifications')} placeholder={t(lang, 'ISO 14001, Green Key, GRS…', 'ISO 14001، Green Key، GRS…')} />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
              {t(lang, 'About your operation', 'عن منشأتكم')}
            </label>
            <textarea
              name="about"
              defaultValue={f('about')}
              rows={4}
              placeholder={t(lang, 'Refurbishment cycle, take-back programs, what makes your operation distinctive…', 'دورة التجديد، برامج الاسترجاع، ما يميز منشأتكم…')}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
        </section>

        <button
          type="submit"
          className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          {t(lang, 'Save profile', 'حفظ الملف')}
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  value,
  placeholder,
  readOnly = false,
  rtl = false,
  type = 'text',
}: {
  name?: string;
  label: string;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  rtl?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-700">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        dir={rtl ? 'rtl' : undefined}
        className={`w-full rounded-lg border border-line px-3 py-2 text-sm ${
          readOnly ? 'bg-mist text-muted' : 'bg-white'
        }`}
      />
    </div>
  );
}
