/**
 * Textile recovery lexicon — the vocabulary data Noura used to rely on
 * the model "just knowing."
 *
 * Every term maps a canonical Arabic label + dialect/transliteration
 * variants to a canonical concept: a textile stream, a fate, or a
 * material type (polymer / fibre). This is DATA, not prompt prose — the
 * resolver, the speech-to-text priming, and INT-01's normalization all
 * read from the same table so there is exactly one spelling authority.
 *
 * Variant lists are deliberately generous (common misspellings, dialect
 * forms, Latin transliterations from untuned ASR output). Matching is
 * done by the resolver after numeral/diacritic normalization.
 *
 * NOTE on honesty: this lexicon encodes domain conventions; it does not
 * by itself prove a figure. The resolver only maps vocabulary — the
 * partner's stated number (plus our indicative unit ranges) is what
 * produces a quantity.
 */

export type WasteStreamCode =
  | 'PI_CARPET'
  | 'PC_CARPET_TILE'
  | 'PC_CARPET_BROADLOOM'
  | 'APPAREL_WEARABLE'
  | 'APPAREL_NONWEARABLE'
  | 'HOSPITALITY_TEXTILE'
  | 'TECHNICAL_TEXTILE'
  | 'TURF'
  | 'OTHER';

export type WasteFateCode =
  | 'REUSED'
  | 'DONATED'
  | 'RECYCLED_POLYMER'
  | 'RECYCLED_FIBER'
  | 'DOWNCYCLED'
  | 'EXPORTED'
  | 'INCINERATED'
  | 'LANDFILLED'
  | 'UNKNOWN';

export interface StreamTerm {
  stream: WasteStreamCode;
  /** Canonical MSA label as used in the official taxonomy (src/facts). */
  canonicalAr: string;
  /** Emirati/Gulf dialect forms, plurals, transliterations, ASR artifacts. */
  variants: string[];
}

export interface FateTerm {
  fate: WasteFateCode;
  canonicalAr: string;
  variants: string[];
}

export interface MaterialTypeTerm {
  /** Canonical Latin spelling used in reports (e.g. "nylon 6", "PP", "cotton"). */
  canonicalEn: string;
  canonicalAr: string;
  variants: string[];
}

// ── Textile streams ────────────────────────────────────────────
// Order matters: more specific terms (carpet tile, roll ends) are listed
// before the generic ones so "بلاط سجاد" resolves to tile, not broadloom.

export const STREAM_TERMS: StreamTerm[] = [
  {
    stream: 'PC_CARPET_TILE',
    canonicalAr: 'بلاط سجاد مستعمل',
    variants: [
      'بلاط سجاد', 'بلاط موكيت', 'بلاطات سجاد', 'بلاطات موكيت', 'مربعات موكيت', 'تايل', 'كاربت تايل',
      'carpet tile', 'carpet tiles', 'tiles', 'modular carpet',
    ],
  },
  {
    stream: 'PI_CARPET',
    canonicalAr: 'سجاد ما بعد التصنيع',
    variants: [
      'بواقي سجاد', 'بواقي موكيت', 'قصاصات موكيت', 'قصاصات سجاد', 'اطراف لفات', 'أطراف لفات', 'عينات سجاد', 'بواقي مصنع', 'سكراب مصنع',
      'offcuts', 'offcut', 'roll ends', 'roll end', 'post-industrial carpet', 'factory carpet waste', 'carpet samples', 'selvedge',
    ],
  },
  {
    stream: 'PC_CARPET_BROADLOOM',
    canonicalAr: 'سجاد مستعمل (لفائف)',
    variants: [
      'موكيت', 'الموكيت', 'موكيت قديم', 'موكيت مستعمل', 'سجاد', 'السجاد', 'سجاد قديم', 'سجاد مستعمل', 'سجاد لفائف', 'سجاد ممرات', 'سجاد فندق', 'موكيت مكاتب', 'زولية', 'زوالي', 'بساط',
      'carpet', 'carpets', 'broadloom', 'moquette', 'old carpet', 'used carpet', 'wall to wall carpet', 'rug', 'rugs',
    ],
  },
  {
    stream: 'TURF',
    canonicalAr: 'عشب صناعي وأرضيات فعاليات',
    variants: [
      'عشب صناعي', 'نجيل صناعي', 'ثيل صناعي', 'عشب اصطناعي', 'ارضيات فعاليات', 'أرضيات فعاليات', 'موكيت فعاليات', 'سجاد فعاليات', 'سجاد معارض', 'موكيت معارض', 'ريد كاربت',
      'turf', 'artificial turf', 'artificial grass', 'astroturf', 'event carpet', 'exhibition carpet', 'event flooring',
    ],
  },
  {
    stream: 'TECHNICAL_TEXTILE',
    canonicalAr: 'منسوجات تقنية وصناعية',
    variants: [
      'بانر', 'بانرات', 'بنر', 'لافتة قماش', 'لافتات', 'قماش تظليل', 'شبك تظليل', 'شادر', 'شوادر', 'خيمة', 'خيام', 'قماش خيام', 'جيوتكستايل', 'قماش صناعي', 'قماش فلتر', 'حبال', 'شباك',
      'banner', 'banners', 'shade cloth', 'shade net', 'geotextile', 'tarpaulin', 'tarp', 'tent fabric', 'technical textile', 'industrial textile', 'filter cloth', 'flex banner',
    ],
  },
  {
    stream: 'HOSPITALITY_TEXTILE',
    canonicalAr: 'منسوجات الضيافة',
    variants: [
      'مفارش', 'مفرش', 'شراشف', 'شرشف', 'ملايات', 'ملاية', 'بياضات', 'مناشف', 'منشفة', 'فوط', 'فوطة', 'بشاكير', 'بشكير', 'ستائر', 'ستارة', 'ستاير', 'برادي', 'مخدات', 'وسائد', 'اغطية وسائد', 'أغطية', 'لحاف', 'لحف', 'بطانيات', 'بطانية', 'روب حمام', 'ارواب', 'تنجيد', 'قماش تنجيد', 'مفارش طاولات', 'مناديل قماش',
      'linen', 'linens', 'bed linen', 'bedding', 'sheets', 'bedsheets', 'towels', 'towel', 'bath towels', 'curtains', 'curtain', 'drapes', 'pillowcases', 'duvet', 'duvets', 'blankets', 'bathrobes', 'upholstery', 'table linen', 'napkins', 'hospitality textiles',
    ],
  },
  {
    stream: 'APPAREL_NONWEARABLE',
    canonicalAr: 'ملابس غير صالحة / بقايا نسيجية',
    variants: [
      'ملابس غير صالحة', 'ملابس خربانة', 'ملابس ممزقة', 'ملابس مقطعة', 'ملابس تالفة', 'خرق', 'خرقة', 'شراطيط', 'شراطيط قماش', 'بقايا قماش', 'بقايا نسيج', 'بقايا نسيجية', 'قصاصات قماش', 'فضلات قماش', 'قماش قص', 'سكراب قماش', 'كتنج', 'cutting waste',
      'non-wearable', 'nonwearable', 'unwearable', 'rags', 'rag', 'wipers', 'textile residue', 'textile scrap', 'fabric scraps', 'cutting scraps', 'damaged clothes', 'torn clothes',
    ],
  },
  {
    stream: 'APPAREL_WEARABLE',
    canonicalAr: 'ملابس صالحة للارتداء',
    variants: [
      'ملابس', 'الملابس', 'ملابس مستعملة', 'ملابس نظيفة', 'ملابس صالحة', 'هدوم', 'ثياب', 'ثوب', 'اثواب', 'أثواب', 'كناديرة', 'كندورة', 'عبايات', 'عباية', 'يونيفورم', 'يونيفورمات', 'زي موحد', 'زي مدرسي', 'ملابس مدرسية', 'ملابس عمل', 'بدلات', 'بدلة عمل', 'احذية', 'أحذية', 'شنط', 'كسوة',
      'apparel', 'clothes', 'clothing', 'garments', 'garment', 'used clothes', 'secondhand clothes', 'second-hand clothes', 'uniform', 'uniforms', 'school uniform', 'workwear', 'kandura', 'abaya', 'shoes', 'wearable',
    ],
  },
  {
    stream: 'OTHER',
    canonicalAr: 'منسوجات أخرى',
    variants: ['منسوجات اخرى', 'منسوجات أخرى', 'قماش ثاني', 'قماش', 'نسيج', 'غيره', 'شغل ثاني', 'other textile', 'other textiles', 'other', 'fabric', 'textile'],
  },
];

// ── Fates ──────────────────────────────────────────────────────
// Order matters: specific routes (polymer / fibre recycling, donation,
// export, downcycling) before generic "recycled", and landfill before
// generic "thrown" words.

export const FATE_TERMS: FateTerm[] = [
  {
    fate: 'DONATED',
    canonicalAr: 'تم التبرع به',
    variants: ['تبرع', 'تبرعنا', 'تبرعنا فيه', 'صدقة', 'للجمعية', 'جمعية خيرية', 'للخيرية', 'للمحتاجين', 'للعمال', 'هلال احمر', 'الهلال الأحمر', 'بيت الخير', 'donated', 'donation', 'charity', 'gave away', 'to charity'],
  },
  {
    fate: 'REUSED',
    canonicalAr: 'أعيد استخدامه',
    variants: ['اعادة استخدام', 'إعادة استخدام', 'استخدمناه مرة ثانية', 'استعمال ثاني', 'بعناه', 'بعنا', 'انباع', 'مبيع', 'سوق مستعمل', 'ثاني يد', 'ريسيل', 'اعيد تركيبه', 'ركبناه مكان ثاني', 'reused', 'reuse', 'resold', 'resale', 'sold', 'second-hand', 'secondhand', 'reinstalled', 'thrift'],
  },
  {
    fate: 'RECYCLED_POLYMER',
    canonicalAr: 'أعيد تدويره (بوليمر)',
    variants: ['تدوير بوليمر', 'تدوير بلاستيك', 'حبيبات', 'تحبيب', 'حبيبات بلاستيك', 'بلاستيك معاد', 'صهر', 'للمصنع البلاستيك', 'polymer recycling', 'polymer route', 'pelletized', 'pellets', 'regranulate', 'regrind', 'plastic recycling', 'chemplax', 'depolymerization', 'depolymerisation'],
  },
  {
    fate: 'RECYCLED_FIBER',
    canonicalAr: 'أعيد تدويره (ألياف)',
    variants: ['تدوير الياف', 'تدوير ألياف', 'الياف معادة', 'ألياف', 'فرم قماش', 'فرم الياف', 'غزل معاد', 'fiber recycling', 'fibre recycling', 'fiber route', 'fibre route', 'shredded to fiber', 'shredded to fibre', 'recycled fiber', 'recycled fibre', 'fiber to fiber', 'fibre to fibre', 'respun'],
  },
  {
    fate: 'DOWNCYCLED',
    canonicalAr: 'تدوير تنازلي',
    variants: ['تدوير تنازلي', 'وايبرز', 'خرق تنظيف', 'فوط تنظيف', 'عزل', 'مادة عزل', 'حشو', 'حشوة', 'اندرلاي', 'تحت الموكيت', 'downcycled', 'downcycling', 'wipers', 'wiping rags', 'insulation', 'underlay', 'underfelt', 'padding', 'stuffing', 'shoddy'],
  },
  {
    fate: 'EXPORTED',
    canonicalAr: 'تم تصديره',
    variants: ['تصدير', 'صدرنا', 'صدرناه', 'مصدر', 'للتصدير', 'راح برا', 'راح افريقيا', 'راح باكستان', 'راح الهند', 'كونتينر', 'حاوية تصدير', 'exported', 'export', 'shipped abroad', 'container to', 'overseas'],
  },
  {
    fate: 'RECYCLED_FIBER',
    canonicalAr: 'أعيد تدويره',
    // Generic "recycled" with no route stated: default to the fibre route
    // and let the resolver note that the route should be confirmed.
    variants: ['تدوير', 'اعادة تدوير', 'إعادة تدوير', 'معاد تدويره', 'لمعيد التدوير', 'للتدوير', 'مصنع تدوير', 'recycled', 'recycling', 'to the recycler'],
  },
  {
    fate: 'INCINERATED',
    canonicalAr: 'حُرق لإنتاج الطاقة',
    variants: ['حرق', 'احترق', 'حرقنا', 'محروق', 'محرقة', 'طاقة من النفايات', 'تحويل الى طاقة', 'incinerated', 'incineration', 'burned', 'burnt', 'waste to energy', 'waste-to-energy', 'wte', 'energy recovery'],
  },
  {
    fate: 'LANDFILLED',
    canonicalAr: 'دُفن في المكب',
    variants: ['مكب', 'المكب', 'للمكب', 'راح المكب', 'مردم', 'المردم', 'دفن', 'مدفون', 'طمر', 'رمينا', 'رميناه', 'مرمي', 'انرمى', 'في السكب', 'سكب', 'الحاوية', 'في الحاوية', 'البلدية اخذته', 'landfill', 'landfilled', 'dumped', 'thrown away', 'thrown out', 'skip', 'in the skip', 'general waste', 'municipality took it'],
  },
];

// ── Material / polymer / fibre types (replaces `variety`) ───────

export const MATERIAL_TYPE_TERMS: MaterialTypeTerm[] = [
  { canonicalEn: 'nylon 6.6',   canonicalAr: 'نايلون 6.6',      variants: ['نايلون 6.6', 'نايلون 66', 'نايلون ٦٦', 'pa66', 'pa 66', 'pa6.6', 'nylon 66', 'nylon 6.6', 'nylon 6,6', 'polyamide 66'] },
  { canonicalEn: 'nylon 6',     canonicalAr: 'نايلون 6',        variants: ['نايلون 6', 'نايلون ٦', 'نايلون ستة', 'pa6', 'pa 6', 'nylon 6', 'nylon6', 'polyamide 6'] },
  { canonicalEn: 'nylon',       canonicalAr: 'نايلون',          variants: ['نايلون', 'النايلون', 'نيلون', 'بولي اميد', 'بولي أميد', 'nylon', 'polyamide'] },
  { canonicalEn: 'PP',          canonicalAr: 'بولي بروبيلين',   variants: ['بولي بروبيلين', 'بولي بروبلين', 'بي بي', 'بروبيلين', 'pp', 'polypropylene', 'polyprop', 'olefin'] },
  { canonicalEn: 'poly-cotton', canonicalAr: 'قطن بوليستر',     variants: ['قطن بوليستر', 'قطن وبوليستر', 'مخلوط', 'خليط قطن', 'poly-cotton', 'polycotton', 'poly cotton', 'cotton blend', 'blend', 'blended'] },
  { canonicalEn: 'PET',         canonicalAr: 'بوليستر',         variants: ['بوليستر', 'البوليستر', 'بولستر', 'بولي استر', 'بي اي تي', 'pet', 'polyester', 'poly'] },
  { canonicalEn: 'cotton',      canonicalAr: 'قطن',             variants: ['قطن', 'القطن', 'قطني', 'قطن 100', 'cotton', '100% cotton', 'cotton terry', 'terry'] },
  { canonicalEn: 'wool',        canonicalAr: 'صوف',             variants: ['صوف', 'الصوف', 'صوفي', 'wool', 'woollen', 'woolen'] },
  { canonicalEn: 'acrylic',     canonicalAr: 'أكريليك',         variants: ['اكريليك', 'أكريليك', 'اكريلك', 'acrylic'] },
  { canonicalEn: 'viscose',     canonicalAr: 'فيسكوز',          variants: ['فيسكوز', 'فسكوز', 'رايون', 'viscose', 'rayon', 'modal', 'lyocell'] },
  { canonicalEn: 'PVC',         canonicalAr: 'بي في سي',        variants: ['بي في سي', 'فينيل', 'pvc', 'vinyl', 'pvc backing', 'pvc-backed'] },
  { canonicalEn: 'bitumen',     canonicalAr: 'بيتومين',         variants: ['بيتومين', 'قار', 'زفت', 'bitumen', 'bitumen backing', 'bitumen-backed', 'asphalt backing'] },
  { canonicalEn: 'latex',       canonicalAr: 'لاتكس',           variants: ['لاتكس', 'مطاط', 'latex', 'latex backing', 'rubber backing', 'sbr'] },
  { canonicalEn: 'jute',        canonicalAr: 'جوت',             variants: ['جوت', 'خيش', 'jute', 'hessian', 'burlap'] },
  { canonicalEn: 'mixed',       canonicalAr: 'مختلط',           variants: ['مختلط', 'مخلط', 'خليط', 'كل شي', 'مشكل', 'mixed', 'assorted', 'mixed fibre', 'mixed fiber', 'mixed materials'] },
];

// ── Lookup helpers ─────────────────────────────────────────────

/** Strip Arabic diacritics + tatweel, unify alef/taa marbuta for matching. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

/** True if `text` contains `term` (normalized, word-boundary-ish for Latin). */
export function containsTerm(text: string, term: string): boolean {
  const nText = normalizeArabic(text);
  const nTerm = normalizeArabic(term);
  if (!nTerm) return false;
  // Arabic matches: substring is fine (morphology is messy anyway).
  // Latin matches: require non-alphanumeric boundaries to avoid "pp" inside "apparel".
  if (/^[a-z0-9\s.,%-]+$/i.test(nTerm)) {
    const re = new RegExp(`(^|[^a-z0-9])${nTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    return re.test(nText);
  }
  return nText.includes(nTerm);
}

export function findStream(text: string): { stream: WasteStreamCode; matched: string } | null {
  for (const t of STREAM_TERMS) {
    for (const v of [t.canonicalAr, ...t.variants]) {
      if (containsTerm(text, v)) return { stream: t.stream, matched: v };
    }
  }
  return null;
}

export function findFate(text: string): { fate: WasteFateCode; matched: string } | null {
  for (const t of FATE_TERMS) {
    for (const v of [t.canonicalAr, ...t.variants]) {
      if (containsTerm(text, v)) return { fate: t.fate, matched: v };
    }
  }
  return null;
}

export function findMaterialType(text: string): { materialType: string; matched: string } | null {
  for (const t of MATERIAL_TYPE_TERMS) {
    for (const v of [t.canonicalAr, ...t.variants]) {
      if (containsTerm(text, v)) return { materialType: t.canonicalEn, matched: v };
    }
  }
  return null;
}

/** @deprecated Use MATERIAL_TYPE_TERMS. Kept so inherited call sites compile. */
export const VARIETY_TERMS = MATERIAL_TYPE_TERMS;
/** @deprecated Use findMaterialType. */
export function findVariety(text: string): { variety: string; matched: string } | null {
  const m = findMaterialType(text);
  return m ? { variety: m.materialType, matched: m.matched } : null;
}
