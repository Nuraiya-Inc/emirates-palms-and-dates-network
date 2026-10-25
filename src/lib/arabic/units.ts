/**
 * Local textile-trade units → kg, with honest low–high ranges.
 *
 * A housekeeping manager never says "340 kg". She says "40 بالة" or
 * "300 متر موكيت". Each entry carries a RANGE, not a point value — per
 * the ESG-honesty and baseline-honesty rules, ranges marked INDICATIVE
 * are estimates to be calibrated against real partner data (weighbridge
 * slips), never presented as measured.
 *
 * Carpet area conversions use the placeholder prior from
 * NTR_FACTS.baseline.validationPriors (carpetKgPerM2Typical = 4.5,
 * broadloom ~3–6 kg/m², tile ~4–5 kg/m²). PLACEHOLDER, INDICATIVE.
 *
 * `ambiguity` controls the resolver's clarify-or-guess policy:
 *   NONE — universally understood (kg, ton) → record directly
 *   LOW  — reasonably consistent local meaning → record the range, note it
 *   HIGH — varies wildly by site/material → MUST trigger a clarifying
 *           question (`clarifier`, phrased in dialect, ready to send)
 */

import { containsTerm } from './lexicon';

export type UnitAmbiguity = 'NONE' | 'LOW' | 'HIGH';

export interface LocalUnit {
  code: string;
  canonicalAr: string;
  variants: string[];
  /** kg bounds for ONE unit (e.g. one بالة, one لفة, one m²). */
  kgLow: number;
  kgHigh: number;
  /** Working midpoint used only when a single number is unavoidable. */
  kgTypical: number;
  ambiguity: UnitAmbiguity;
  /** One targeted question in Gulf dialect — asked ONLY when the
   *  answer changes the number. */
  clarifier?: string;
  caveat: string;
}

export const LOCAL_UNITS: LocalUnit[] = [
  {
    code: 'TON',
    canonicalAr: 'طن',
    variants: ['طن', 'اطنان', 'أطنان', 'طنن', 'طن واحد', 'ton', 'tons', 'tonne', 'tonnes', 'mt'],
    kgLow: 1000, kgHigh: 1000, kgTypical: 1000,
    ambiguity: 'NONE',
    caveat: 'Metric ton = 1000 kg.',
  },
  {
    code: 'KG',
    canonicalAr: 'كيلو',
    variants: ['كيلو', 'كج', 'كغ', 'كغم', 'كيلوغرام', 'كيلوجرام', 'كيلوهات', 'kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
    kgLow: 1, kgHigh: 1, kgTypical: 1,
    ambiguity: 'NONE',
    caveat: 'Kilogram.',
  },
  {
    code: 'SQM_CARPET',
    canonicalAr: 'متر مربع',
    variants: ['متر مربع', 'م2', 'م٢', 'متر', 'امتار', 'أمتار', 'متر موكيت', 'امتار موكيت', 'متر سجاد', 'sqm', 'sq m', 'sq.m', 'm2', 'm²', 'square meter', 'square metre', 'square meters', 'square metres', 'meters of carpet', 'metres of carpet'],
    kgLow: 3, kgHigh: 6, kgTypical: 4.5,
    ambiguity: 'LOW',
    clarifier: 'موكيت لفائف ولا بلاط؟ وفيه ظهر بيتومين ولا بي في سي؟ (عشان الوزن يختلف)',
    caveat: 'INDICATIVE / PLACEHOLDER. Area to weight uses the carpetKgPerM2Typical prior (4.5 kg/m²; broadloom ~3–6, tile ~4–5, bitumen or PVC backed tile at the heavy end). Record the range and confirm against a weighbridge slip when one exists.',
  },
  {
    code: 'BALE',
    canonicalAr: 'بالة',
    variants: ['بالة', 'باله', 'بالات', 'بالتين', 'بيل', 'بيلات', 'بالة ملابس', 'بالة قماش', 'bale', 'bales', 'baled'],
    kgLow: 40, kgHigh: 500, kgTypical: 100,
    ambiguity: 'HIGH',
    clarifier: 'البالة عندكم يدوية (40–60 كغ) ولا مكبس (300–500 كغ)؟',
    caveat: 'INDICATIVE. A hand-tied clothing bale is ~40–60 kg; a mill-pressed export bale is ~300–500 kg; carpet bales vary. The spread is real. Ask unless the partner gives a count AND a size.',
  },
  {
    code: 'BAG',
    canonicalAr: 'كيس',
    variants: ['كيس', 'اكياس', 'أكياس', 'كيسين', 'شوال', 'شوالات', 'شولة', 'جوال', 'جوالات', 'كيس زبالة', 'كيس اسود', 'كيس أسود', 'bag', 'bags', 'sack', 'sacks', 'bin bag', 'bin bags', 'garbage bag', 'black bag'],
    kgLow: 5, kgHigh: 25, kgTypical: 12,
    ambiguity: 'HIGH',
    clarifier: 'الكيس كم كيلو تقريباً؟ كيس زبالة عادي (5–10 كغ) ولا شوال كبير (20–25 كغ)؟',
    caveat: 'INDICATIVE. A bin bag of clothes is ~5–10 kg; a large woven sack ~20–25 kg. Ask before recording if it changes the number.',
  },
  {
    code: 'ROLL',
    canonicalAr: 'لفة',
    variants: ['لفة', 'لفه', 'لفات', 'لفتين', 'رول', 'رولات', 'لفة موكيت', 'لفة سجاد', 'لفة قماش', 'roll', 'rolls', 'carpet roll', 'fabric roll'],
    kgLow: 20, kgHigh: 120, kgTypical: 60,
    ambiguity: 'HIGH',
    clarifier: 'اللفة كم متر تقريباً وكم عرضها؟ (لفة موكيت كاملة ولا بواقي؟)',
    caveat: 'INDICATIVE. A full 4 m broadloom roll can exceed 100 kg; a roll end or fabric bolt is far lighter. Ask length and width when it matters.',
  },
  {
    code: 'PIECE',
    canonicalAr: 'قطعة',
    variants: ['قطعة', 'قطعه', 'قطع', 'قطعتين', 'حبة', 'حبات', 'بيس', 'بيسات', 'piece', 'pieces', 'pcs', 'items', 'item', 'units'],
    kgLow: 0.2, kgHigh: 1.5, kgTypical: 0.5,
    ambiguity: 'HIGH',
    clarifier: 'القطع ملابس ولا مفارش ولا مناشف؟ (عشان نحسب الوزن التقريبي)',
    caveat: 'INDICATIVE. One garment ~0.2–0.8 kg; a towel or sheet ~0.5–1.5 kg; a duvet or curtain much more. Ask what the pieces are.',
  },
  {
    code: 'PALLET',
    canonicalAr: 'طبلية',
    variants: ['طبلية', 'طبليه', 'طبالي', 'باليت', 'باليتات', 'بالت', 'pallet', 'pallets', 'palette'],
    kgLow: 200, kgHigh: 800, kgTypical: 450,
    ambiguity: 'HIGH',
    clarifier: 'الطبلية محملة بلاط سجاد ولا ملابس؟ وكم ارتفاعها تقريباً؟',
    caveat: 'INDICATIVE. A pallet of carpet tile stacks heavy (~600–800 kg); a pallet of bagged textiles is ~200–400 kg. Ask what is on it.',
  },
  {
    code: 'BOX',
    canonicalAr: 'كرتون',
    variants: ['كرتون', 'كراتين', 'كرتونة', 'صندوق', 'صناديق', 'بوكس', 'box', 'boxes', 'carton', 'cartons'],
    kgLow: 5, kgHigh: 20, kgTypical: 10,
    ambiguity: 'HIGH',
    clarifier: 'الكرتون صغير (5 كغ) ولا كبير (15–20 كغ)؟',
    caveat: 'INDICATIVE. Retail cartons vs removal boxes differ a lot.',
  },
  {
    code: 'SKIP',
    canonicalAr: 'حاوية',
    variants: ['حاوية', 'حاويه', 'حاويات', 'سكب', 'سكيب', 'سكبات', 'حاوية زبالة', 'skip', 'skips', 'dumpster', 'dumpsters', 'roll-off', 'roll off'],
    kgLow: 300, kgHigh: 2000, kgTypical: 800,
    ambiguity: 'HIGH',
    clarifier: 'الحاوية كم ياردة تقريباً، وكانت موكيت ولا قماش خفيف؟',
    caveat: 'INDICATIVE. A 6 yd skip of carpet strip-out is ~1–2 t; a skip of loose textiles far less. Ask size and content; prefer the weighbridge slip.',
  },
  {
    code: 'TRUCKLOAD',
    canonicalAr: 'حمولة',
    variants: ['حمولة', 'حموله', 'حمولات', 'لود', 'لودين', 'شحنة', 'شحنتين', 'حمولة بيك اب', 'حمولة شاحنة', 'حمولة تريلا', 'وايت', 'load', 'loads', 'pickup load', 'truckload', 'truck load', 'lorry load', 'van load', 'container load'],
    kgLow: 300, kgHigh: 5000, kgTypical: 1500,
    ambiguity: 'HIGH',
    clarifier: 'حمولة بيك اب ولا شاحنة 3 طن ولا تريلا؟ كم طن تقريباً فيها؟',
    caveat: 'INDICATIVE. A pickup of textiles is well under a ton; a 3 t truck or a container can carry several. Ask the vehicle size; prefer the weighbridge slip.',
  },
  {
    code: 'ROOM',
    canonicalAr: 'غرفة',
    variants: ['غرفة', 'غرفه', 'غرف', 'غرفتين', 'room', 'rooms', 'guest room', 'guest rooms', 'keys'],
    kgLow: 15, kgHigh: 40, kgTypical: 25,
    ambiguity: 'HIGH',
    clarifier: 'تقصدون مفارش ومناشف الغرف لسنة كاملة، ولا موكيت الغرف عند التجديد؟',
    caveat: 'INDICATIVE / PLACEHOLDER. Uses the hotelLinenKgPerRoomYearTypical prior (25 kg linen per room-year). A room carpet strip-out is a different number entirely (area × kg/m²). Always confirm which is meant.',
  },
];

/** Fraction modifiers around a unit: "طن ونص" = 1.5t, "نص طن" = 0.5t.
 *
 * Semantics: every modifier adds `factor` of ONE unit. `impliesWhole`
 * marks the و-variants ("و نص", "وربع") that carry an implied whole unit
 * — "طن ونص" = 1 + 0.5. Bare fractions ("نص طن") add only the fraction.
 * The resolver picks the LONGEST matched variant so "ونص" beats the
 * "نص" nested inside it. */
export const UNIT_MODIFIERS: { variants: string[]; factor: number; impliesWhole?: boolean }[] = [
  { variants: ['و نص', 'ونص', 'وزيد نص', 'زايد نص'], factor: 0.5, impliesWhole: true },
  { variants: ['و ربع', 'وربع'], factor: 0.25, impliesWhole: true },
  { variants: ['و ثلث', 'وثلث'], factor: 1 / 3, impliesWhole: true },
  { variants: ['نص', 'نصف', 'نص واحد'], factor: 0.5 },
  { variants: ['ربع', 'ربعة'], factor: 0.25 },
  { variants: ['ثلث'], factor: 1 / 3 },
];

/** Approximation markers — widen the resulting range. */
export const APPROX_MARKERS = [
  'حوالي', 'تقريبا', 'تقريبًا', 'شي', 'زي', 'زيه', 'قريب', 'بحدود', 'بنحو',
  'اللي هو', 'يعني', 'قريب من', 'في حدود', 'ميش', 'about', 'around', 'roughly', 'approx',
];

// ── Number words (1–10, common in speech) ──────────────────────

export const NUMBER_WORDS: { ar: string; value: number }[] = [
  { ar: 'واحد', value: 1 }, { ar: 'واحدة', value: 1 },
  { ar: 'اثنين', value: 2 }, { ar: 'ثنين', value: 2 }, { ar: 'زوج', value: 2 },
  { ar: 'عشرين', value: 20 }, { ar: 'ثلاثين', value: 30 },
  { ar: 'أربعين', value: 40 }, { ar: 'اربعين', value: 40 },
  { ar: 'خمسين', value: 50 }, { ar: 'ستين', value: 60 },
  { ar: 'سبعين', value: 70 }, { ar: 'ثمانين', value: 80 },
  { ar: 'تسعين', value: 90 },
  { ar: 'مئة', value: 100 }, { ar: 'ميه', value: 100 }, { ar: 'مية', value: 100 },
  { ar: 'مئتين', value: 200 }, { ar: 'ميتين', value: 200 },
  { ar: 'ألف', value: 1000 }, { ar: 'الف', value: 1000 },
  { ar: 'ثلاثة', value: 3 }, { ar: 'ثلاث', value: 3 },
  { ar: 'أربعة', value: 4 }, { ar: 'اربعة', value: 4 }, { ar: 'اربع', value: 4 },
  { ar: 'خمسة', value: 5 }, { ar: 'خمس', value: 5 },
  { ar: 'ستة', value: 6 }, { ar: 'ست', value: 6 },
  { ar: 'سبعة', value: 7 }, { ar: 'سبع', value: 7 },
  { ar: 'ثمانية', value: 8 }, { ar: 'ثماني', value: 8 },
  { ar: 'تسعة', value: 9 }, { ar: 'تسع', value: 9 },
  { ar: 'عشرة', value: 10 }, { ar: 'عشر', value: 10 },
];

// ── Matching helpers ───────────────────────────────────────────

export function findUnit(text: string): LocalUnit | null {
  for (const u of LOCAL_UNITS) {
    for (const v of [u.canonicalAr, ...u.variants]) {
      if (containsTerm(text, v)) return u;
    }
  }
  return null;
}
