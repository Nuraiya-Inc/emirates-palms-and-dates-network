/**
 * Portal — shared bilingual labels for the textile taxonomy.
 *
 * Streams, fates, partner types and marketplace categories, keyed by the
 * Prisma enum values. Labels follow the Naseej glossary exactly; the stream
 * and partner-type tables are derived from NTR_FACTS so the portal never
 * drifts from the fact graph.
 */

import type { ListingCategory, PartnerType, WasteFate, WasteStream } from '@prisma/client';
import { NTR_FACTS } from '@/facts';
import type { PortalLang } from '@/lib/portal-lang';

export interface BiLabel {
  en: string;
  ar: string;
}

export const STREAM_LABELS: Record<WasteStream, BiLabel> = Object.fromEntries(
  NTR_FACTS.taxonomy.wasteStreams.map((s) => [s.code, { en: s.en, ar: s.ar }]),
) as Record<WasteStream, BiLabel>;

export const PARTNER_TYPE_LABELS: Record<PartnerType, BiLabel> = Object.fromEntries(
  NTR_FACTS.taxonomy.partnerTypes.map((p) => [p.code, { en: p.en, ar: p.ar }]),
) as Record<PartnerType, BiLabel>;

export const FATE_LABELS: Record<WasteFate, BiLabel> = {
  REUSED:           { en: 'Reused / resold',                 ar: 'أعيد استخدامه' },
  DONATED:          { en: 'Donated to charity',              ar: 'تم التبرع به' },
  RECYCLED_POLYMER: { en: 'Recycled (polymer route)',        ar: 'أعيد تدويره (بوليمر)' },
  RECYCLED_FIBER:   { en: 'Recycled (fibre route)',          ar: 'أعيد تدويره (ألياف)' },
  DOWNCYCLED:       { en: 'Downcycled',                      ar: 'تدوير تنازلي' },
  EXPORTED:         { en: 'Exported for reuse or recycling', ar: 'تم تصديره' },
  INCINERATED:      { en: 'Waste-to-energy / incinerated',   ar: 'حُرق لإنتاج الطاقة' },
  LANDFILLED:       { en: 'Landfilled (reason logged)',      ar: 'دُفن في المكب' },
  UNKNOWN:          { en: 'Unknown',                         ar: 'غير معروف' },
};

export const CATEGORY_LABELS: Record<ListingCategory, BiLabel> = {
  CARPET_PI:           { en: 'Post-industrial carpet',   ar: 'سجاد ما بعد التصنيع' },
  CARPET_PC:           { en: 'Post-consumer carpet',     ar: 'سجاد مستعمل' },
  APPAREL:             { en: 'Apparel',                  ar: 'ملابس' },
  HOSPITALITY_TEXTILE: { en: 'Hospitality textiles',     ar: 'منسوجات الضيافة' },
  TECHNICAL_TEXTILE:   { en: 'Technical textiles',       ar: 'منسوجات تقنية' },
  FIBER_FEEDSTOCK:     { en: 'Fibre feedstock',          ar: 'ألياف كمواد خام' },
  RECYCLED_PRODUCTS:   { en: 'Recycled products',        ar: 'منتجات معاد تدويرها' },
  OTHER:               { en: 'Other',                    ar: 'أخرى' },
};

/** Partner types that collect, haul or process loads (the "offtaker side"). */
export const OFFTAKER_TYPES: readonly PartnerType[] = [
  'RECYCLER',
  'HAULIER',
  'DIVERSION_UNIT',
  'SORTER',
  'CHARITY',
  'MANUFACTURER',
];

/** Partner types that process material themselves (capacity is a profile field). */
export const PROCESSOR_TYPES: readonly PartnerType[] = ['RECYCLER', 'SORTER', 'DIVERSION_UNIT'];

/** "Label · Label-in-other-language" for pickers where both scripts help. */
export function both(lang: PortalLang, l: BiLabel): string {
  return lang === 'ar' ? `${l.ar} · ${l.en}` : `${l.en} · ${l.ar}`;
}

/** One language only. */
export function one(lang: PortalLang, l: BiLabel): string {
  return lang === 'ar' ? l.ar : l.en;
}

/** Emirate name in the portal language. */
export function regionName(lang: PortalLang, code: string): string {
  const r = NTR_FACTS.regions.find((x) => x.code === code);
  if (!r) return code;
  return lang === 'ar' ? r.nameAr : r.nameEn;
}
