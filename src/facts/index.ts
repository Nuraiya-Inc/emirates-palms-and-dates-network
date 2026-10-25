/**
 * Naseej Textile Recovery Platform — fact graph (v0, UAE edition).
 *
 * Single source of truth for the taxonomy, per-emirate baseline, tier ladder,
 * and hard rules that every agent inherits via the cached prompt prefix.
 *
 * BASELINE HONESTY CONTRACT (read before editing):
 *   - The ONLY reported national figures are those published at the launch of
 *     the UAE's National Initiative for Textile Circularity (June 2026):
 *     ~220,000 t of textile waste per year, ~88% of it to landfill, ~500 million
 *     textile items consumed per year. Source: Khaleej Times, 8 Jun 2026,
 *     quoting the initiative and Tadweer Group. Treat as REPORTED, approximate.
 *   - NO emirate publishes a textile-waste baseline. Every per-emirate row is an
 *     INDICATIVE allocation of the national figure (weighted by population and
 *     commercial footprint) so dashboards render. They are placeholders to be
 *     REPLACED by network-measured data, never quoted externally, never
 *     presented as fact by any agent.
 *   - Stream splits (carpet / apparel / hospitality / other) are INDICATIVE
 *     working assumptions, not published data. Carpet and commercial textiles
 *     are not separately counted anywhere in the UAE today. Counting them IS
 *     the product.
 *   - Unit coefficients (kg per m² of carpet, kg of linen per room-year) are
 *     PLACEHOLDER validation priors from general industry ranges.
 *
 * This module also provides back-compat shims for the runtime the platform
 * inherited (freeze/pause status, current-date block, theme block).
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface RegionBaselineFact {
  /** Canonical enum value used in the DB (matches Prisma Region enum) */
  code: string;
  nameEn: string;
  nameAr: string;
  /** REPORTED = published figure · INDICATIVE = allocation placeholder */
  baselineQuality: 'REPORTED' | 'INDICATIVE';
  textileWasteTons: number;        // indicative share of the national 220,000 t
  landfilledTons: number;          // 88% of textileWasteTons
  carpetTons: number;              // indicative split
  apparelTons: number;             // indicative split
  hospitalityTextileTons: number;  // indicative split
  otherTextileTons: number;        // indicative split
  hotelRooms: number | null;       // null = not sourced here
  recyclers: number | null;        // null = not centrally published
  sorters: number | null;
  collectionPoints: number | null;
}

export interface TierFact {
  code: string;
  order: number;
  nameEn: string;
  nameAr: string;
  earnedBy: string;
  unlocks: string;
}

export type FactsSection =
  | 'identity'
  | 'taxonomy'
  | 'regions'
  | 'tiers'
  | 'baseline'
  | 'engagement'
  | 'esg'
  | 'rules';

export const FACTS_SECTIONS: FactsSection[] = [
  'identity',
  'taxonomy',
  'regions',
  'tiers',
  'baseline',
  'engagement',
  'esg',
  'rules',
];

// ─────────────────────────────────────────────────────────────────
// The facts — seven emirates
// ─────────────────────────────────────────────────────────────────
//
// Allocation of the national 220,000 t: Dubai 38% · Abu Dhabi 30% · Sharjah
// 15% · Ajman 6% · RAK 5% · Fujairah 3.5% · UAQ 2.5% (population plus
// commercial footprint weighting — INDICATIVE). Stream split applied uniformly:
// apparel 55% · hospitality textiles 15% · carpet 15% · other 15%. Landfilled =
// 88% of the row. All rounded.

export const REGION_BASELINE: RegionBaselineFact[] = [
  { code: 'DUBAI',          nameEn: 'Dubai',          nameAr: 'دبي',          baselineQuality: 'INDICATIVE', textileWasteTons: 83_600, landfilledTons: 73_568, carpetTons: 12_540, apparelTons: 45_980, hospitalityTextileTons: 12_540, otherTextileTons: 12_540, hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
  { code: 'ABU_DHABI',      nameEn: 'Abu Dhabi',      nameAr: 'أبوظبي',       baselineQuality: 'INDICATIVE', textileWasteTons: 66_000, landfilledTons: 58_080, carpetTons: 9_900,  apparelTons: 36_300, hospitalityTextileTons: 9_900,  otherTextileTons: 9_900,  hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
  { code: 'SHARJAH',        nameEn: 'Sharjah',        nameAr: 'الشارقة',      baselineQuality: 'INDICATIVE', textileWasteTons: 33_000, landfilledTons: 29_040, carpetTons: 4_950,  apparelTons: 18_150, hospitalityTextileTons: 4_950,  otherTextileTons: 4_950,  hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
  { code: 'AJMAN',          nameEn: 'Ajman',          nameAr: 'عجمان',        baselineQuality: 'INDICATIVE', textileWasteTons: 13_200, landfilledTons: 11_616, carpetTons: 1_980,  apparelTons: 7_260,  hospitalityTextileTons: 1_980,  otherTextileTons: 1_980,  hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
  { code: 'RAS_AL_KHAIMAH', nameEn: 'Ras Al Khaimah', nameAr: 'رأس الخيمة',   baselineQuality: 'INDICATIVE', textileWasteTons: 11_000, landfilledTons: 9_680,  carpetTons: 1_650,  apparelTons: 6_050,  hospitalityTextileTons: 1_650,  otherTextileTons: 1_650,  hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
  { code: 'FUJAIRAH',       nameEn: 'Fujairah',       nameAr: 'الفجيرة',      baselineQuality: 'INDICATIVE', textileWasteTons: 7_700,  landfilledTons: 6_776,  carpetTons: 1_155,  apparelTons: 4_235,  hospitalityTextileTons: 1_155,  otherTextileTons: 1_155,  hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
  { code: 'UMM_AL_QUWAIN',  nameEn: 'Umm Al Quwain',  nameAr: 'أم القيوين',   baselineQuality: 'INDICATIVE', textileWasteTons: 5_500,  landfilledTons: 4_840,  carpetTons: 825,    apparelTons: 3_025,  hospitalityTextileTons: 825,    otherTextileTons: 825,    hotelRooms: null, recyclers: null, sorters: null, collectionPoints: null },
];

export const TIER_LADDER: TierFact[] = [
  { code: 'REGISTERED', order: 0, nameEn: 'Registered',                 nameAr: 'مسجّل',               earnedBy: 'Verified identity + basic profile', unlocks: 'Network registry listing, Noura access, pickup requests, guide access' },
  { code: 'ACTIVE',     order: 1, nameEn: 'Active Member',              nameAr: 'عضو نشط',             earnedBy: '2 consecutive verified quarterly diversion reports', unlocks: 'Member seal, emirate benchmarking reports, marketplace listing, diversion certificate per quarter' },
  { code: 'CERTIFIED',  order: 2, nameEn: 'Certified Recovery Partner', nameAr: 'شريك استعادة معتمد',  earnedBy: '4 quarters of reporting + a chain-of-custody audit (every load traced to a logged fate)', unlocks: 'Certification mark, verified diversion statement for ESG reporting, incentive-program eligibility, priority offtaker introductions' },
  { code: 'ELITE',      order: 3, nameEn: 'Elite Recovery Partner',     nameAr: 'شريك استعادة نخبة',   earnedBy: 'Sustained excellence + contribution to national goals (data quality, verified diversion rate, mentoring, take-back programs)', unlocks: 'Annual ceremony recognition, featured national profile, advisory-council seat, first access to stewardship pilots' },
];

export const NTR_FACTS = {
  identity: {
    platformNameEn: 'Naseej Textile Recovery Platform',
    platformNameAr: 'منصة نسيج لاستعادة المنسوجات',
    authority:
      'An independent partner-network platform for textile recovery in the UAE. Operating partner: Nuraiya. Anchor processor for carpet and polyolefin fractions: Chemplax (Kenton, Tennessee; UAE entry in progress). The platform is built in alignment with the UAE’s Net Zero 2050 agenda, the Integrated Waste Management Agenda and the national drive for textile circularity; it does not represent, and must never claim to represent, any government authority or the national textile-circularity initiative unless a mandate is formally in place.',
    mission:
      'Give textile recovery in the UAE one register and one ledger: every participant enrols once, every load is logged at removal, graded before it moves, routed to the offtaker who can use it, and counted whatever its fate. Track and trace first, collect second, valorize third. The platform converts an uncounted stream into measured national data, starting with the commercial and carpet streams nobody counts today.',
    principle:
      'Visibility → routing → diversion → evidence → incentives → more visibility. Nobody subsidizes a stream they cannot see.',
  },
  taxonomy: {
    partnerTypes: [
      { code: 'RECYCLER',       en: 'Recycler / Processor',                 ar: 'معيد تدوير / معالج',             subtypes: ['POLYMER', 'FIBER', 'MIXED'] },
      { code: 'INSTALLER',      en: 'Carpet Installer / Remover',           ar: 'مقاول تركيب وإزالة السجاد',      subtypes: [] as string[] },
      { code: 'DIVERSION_UNIT', en: 'Landfill Diversion Unit',              ar: 'وحدة تحويل عن المكب',            subtypes: [] as string[] },
      { code: 'CHARITY',        en: 'Charity / Reuse Organisation',         ar: 'جمعية خيرية / إعادة استخدام',   subtypes: [] as string[] },
      { code: 'HOSPITALITY',    en: 'Hotel / Hospitality Group',            ar: 'فندق / مجموعة ضيافة',           subtypes: ['HOTEL', 'MALL', 'AIRPORT', 'VENUE'] },
      { code: 'FACILITY',       en: 'Facilities Management / Property',     ar: 'إدارة مرافق / محفظة عقارية',    subtypes: [] as string[] },
      { code: 'RETAILER',       en: 'Retailer / Brand',                     ar: 'متاجر تجزئة / علامة تجارية',    subtypes: [] as string[] },
      { code: 'MANUFACTURER',   en: 'Flooring / Textile Manufacturer',      ar: 'مصنّع أرضيات / منسوجات',        subtypes: ['FLOORING', 'TEXTILE', 'UNIFORM'] },
      { code: 'HAULIER',        en: 'Haulier / Logistics',                  ar: 'ناقل / خدمات لوجستية',          subtypes: [] as string[] },
      { code: 'SORTER',         en: 'Sorter / Grader / Exporter',           ar: 'فارز / مصنّف / مصدّر',          subtypes: [] as string[] },
    ],
    wasteStreams: [
      { code: 'PI_CARPET',           en: 'Post-industrial carpet',        ar: 'سجاد ما بعد التصنيع' },
      { code: 'PC_CARPET_TILE',      en: 'Post-consumer carpet tile',     ar: 'بلاط سجاد مستعمل' },
      { code: 'PC_CARPET_BROADLOOM', en: 'Post-consumer broadloom carpet', ar: 'سجاد مستعمل (لفائف)' },
      { code: 'APPAREL_WEARABLE',    en: 'Wearable apparel',              ar: 'ملابس صالحة للارتداء' },
      { code: 'APPAREL_NONWEARABLE', en: 'Non-wearable apparel / residue', ar: 'ملابس غير صالحة / بقايا نسيجية' },
      { code: 'HOSPITALITY_TEXTILE', en: 'Hospitality textiles',          ar: 'منسوجات الضيافة' },
      { code: 'TECHNICAL_TEXTILE',   en: 'Technical / industrial textiles', ar: 'منسوجات تقنية وصناعية' },
      { code: 'TURF',                en: 'Artificial turf / event flooring', ar: 'عشب صناعي وأرضيات فعاليات' },
      { code: 'OTHER',               en: 'Other textile',                 ar: 'منسوجات أخرى' },
    ],
    wasteFates: ['REUSED', 'DONATED', 'RECYCLED_POLYMER', 'RECYCLED_FIBER', 'DOWNCYCLED', 'EXPORTED', 'INCINERATED', 'LANDFILLED', 'UNKNOWN'],
    /** Fates that count toward a partner's diversion rate. */
    divertedFates: ['REUSED', 'DONATED', 'RECYCLED_POLYMER', 'RECYCLED_FIBER', 'DOWNCYCLED', 'EXPORTED'],
    grading:
      'Every load is graded at intake, before it moves: stream, polymer or fibre type, backing type (carpet: polyolefin / bitumen / PVC / latex), weight, contamination level (clean / light / heavy), moisture, source partner, removal date, photo, grader. PVC-backed carpet and heavily contaminated loads are routed separately. A load that cannot be valorized is still logged and routed to landfill with its reason; the diversion number is only credible if the non-diverted loads are counted too.',
  },
  regions: REGION_BASELINE,
  tiers: TIER_LADDER,
  membership: {
    annualRenewal:
      'Certification (CERTIFIED and ELITE) is ANNUAL. The certificate carries a year stamp and is valid through 31 December of its year. It renews automatically as long as quarterly diversion reporting stays current. A full 12 months with no approved report triggers a certification LAPSE — drafted by cer-01 for official approval (never announced as final before approval). Re-certification after a lapse: 4 fresh approved quarters; history and registry number are always preserved.',
    standingLadder:
      'Standing decays mechanically without reporting (a quarter becomes due 30 days after it ends): 1 missed due quarter → AT_RISK (courteous heads-up; benefits intact — frame as "protect your standing"); 2+ missed → PAUSED (benefits paused: marketplace, pickup priority, certificate download; membership and history preserved). Restoration is instant: completing the missing record with Noura returns standing to GOOD automatically.',
    tone:
      'Never threaten. State the fact, the date it takes effect, and the easy path back — in one breath. "التقرير القادم يحمي اعتمادكم" beats any warning. Loss language is allowed only as protection language: partners should feel they are protecting something valuable they already own.',
  },
  baseline: {
    source:
      'Reported national figures: UAE National Initiative for Textile Circularity launch coverage (Khaleej Times, 8 June 2026, quoting the initiative and Tadweer Group): ~220,000 t/yr textile waste, ~88% to landfill, ~500 million textile items consumed per year. Per-emirate rows and stream splits are INDICATIVE allocations, not published data.',
    nationalTotals: {
      /** Reported by the national initiative (approximate) */
      textileWasteTons: 220_000,
      landfillShare: 0.88,
      landfilledTons: 193_600,
      textileItemsConsumedPerYear: 500_000_000,
      /** Sum of the region table (equals the national figure by construction) */
      workingSetTextileWasteTons: 220_000,
      workingSetLandfilledTons: 193_600,
      /** Indicative stream splits over the working set */
      carpetTons: 33_000,
      apparelTons: 121_000,
      hospitalityTextileTons: 33_000,
      otherTextileTons: 33_000,
      /** Not centrally published — the network's first data campaign */
      recyclers: null as number | null,
      sorters: null as number | null,
      collectionPoints: null as number | null,
    },
    caveats: [
      'No emirate publishes a textile-waste baseline. Every per-emirate row is an INDICATIVE allocation of the national figure — a placeholder to be replaced by network-measured data, never to be quoted externally or presented as fact.',
      'The national figures (~220,000 t/yr, ~88% landfilled) are approximate figures reported at the national initiative’s launch; cite them as such with the date.',
      'Stream splits (apparel, carpet, hospitality, other) are working assumptions. Carpet and commercial textiles are not separately counted anywhere in the UAE today.',
      'Recycler, sorter and collection-point counts and intake volumes are not centrally published — establishing them is the platform’s first data campaign.',
      'Known UAE context: one operating textile recycling facility in Dubai (2,000 t/yr initial capacity, 2024); sorting and export operators in Sharjah free zones; municipality-approved textile recyclers in Dubai industrial areas; mosque and retail clothing-collection boxes. Treat as context, not as a counted baseline.',
    ],
    validationPriors: {
      /** PLACEHOLDER priors from general industry ranges — replace with measured data */
      carpetKgPerM2Typical: 4.5,
      hotelLinenKgPerRoomYearTypical: 25,
      apparelKgPerCapitaYearTypical: 20,
      contaminationRejectRateTypical: 0.15,
    },
  },
  engagement: {
    seasonalCalendar: [
      { period: 'Jan–Mar', focus: 'Hotel and office refurbishment windows — carpet strip-out pickups; registration drive with FM companies' },
      { period: 'Ramadan', focus: 'Donation peak — apparel donation drives with charity partners; surge pickup capacity' },
      { period: 'Sep–Oct', focus: 'Back-to-school uniform take-back; Dubai fit-out season — installer and contractor onboarding' },
      { period: 'Nov–Dec', focus: 'Event season — event carpet, banners and turf recovery; annual recognition and emirate standings' },
    ],
    gamification:
      'Honor-based, not points-based: emirate standings (never individual shaming), ceremonial awards presented by dignitaries, physical member seals, founding-partner designations. Every report returns immediate value: polished bilingual summary + emirate benchmark + one actionable insight.',
  },
  esg: {
    principle:
      'Every diverted tonne is a measurable climate contribution. The platform converts diversion data into INDICATIVE avoided-emissions estimates and an annual Sustainability Contribution Statement per partner — and builds the UAE-wide textile-recovery ESG picture no one currently has.',
    indicativeFactorTCO2ePerTon: 1.5,
    factorCaveat:
      'Single conservative placeholder factor (1.5 tCO2e per productively-diverted tonne, covering avoided landfill methane and displaced virgin fibre or polymer, vs a landfill baseline). INDICATIVE ONLY — replace with stream-specific, methodology-backed factors from a qualified carbon consultant before any external claim.',
    creditPathway:
      'Estimates are NOT carbon credits. The pathway: the UAE’s Net Zero 2050 strategy and the 2024 federal climate law establish national carbon accounting, and Abu Dhabi hosts carbon-market infrastructure (e.g. exchange platforms in ADGM). The platform’s role is the measured, auditable MRV dataset such programs require — partners with verified diversion records are pre-positioned for enrollment when a program opens. Verify current program details before citing specifics to partners.',
    agentGuidance:
      'When partners ask about carbon credits or ESG reporting: be encouraging AND precise. Their verified diversion builds an auditable record that positions them for future programs and supports their own ESG disclosures; the estimate itself is indicative and not tradeable. Never promise credits, subsidies or revenue.',
  },
  hardRules: [
    { id: 'NTR-1', severity: 'CRITICAL', rule: 'The network is neutral infrastructure for textile recovery in the UAE. Never favor any commercial party (including the operating partner or the anchor processor) in analysis, routing, matchmaking, or data access. Routing follows grade, acceptance spec, distance and capacity.' },
    { id: 'NTR-2', severity: 'CRITICAL', rule: 'Certification grants, tier changes, standing suspensions, and public registry changes are agent-DRAFTED but human-APPROVED. Never announce one as final until a network official approves it in the review queue.' },
    { id: 'NTR-3', severity: 'CRITICAL', rule: 'Partner data is confidential. Never reveal one partner’s figures, sites, contracts or inbound loads to another partner. Benchmarks are aggregates only (minimum 3 partners per aggregate).' },
    { id: 'NTR-4', severity: 'CRITICAL', rule: 'Never claim or imply government authority, endorsement, or mandate, and never claim affiliation with the UAE National Initiative for Textile Circularity (which also carries the name Naseej) unless a formal agreement exists. The network is an independent platform aligned with national goals; certification is the NETWORK’s recognition.' },
    { id: 'NTR-5', severity: 'HIGH', rule: 'Arabic first. Partner-facing messages default to Arabic (Modern Standard, warm-formal register) with English available. Latin numerals in both languages.' },
    { id: 'NTR-6', severity: 'HIGH', rule: 'Never ask a partner for information they have already provided. Check the partner profile and report history first. Confirm, don’t interrogate: play back what you understood, ask only for genuinely missing fields.' },
    { id: 'NTR-7', severity: 'HIGH', rule: 'Baseline figures: only the national totals are reported (and approximate); emirate rows and stream splits are INDICATIVE placeholders, and unit coefficients are placeholder priors. Use them as validation priors, never present them as measured fact. Reported data replaces modeled data.' },
    { id: 'NTR-8', severity: 'HIGH', rule: 'Every load gets a logged fate, including landfill with its reason. Never let a load disappear from the ledger to flatter a diversion rate.' },
    { id: 'NTR-9', severity: 'MEDIUM', rule: 'Tone: professional, warm, respectful of the partner’s standing. Recognition language is generous; compliance language is never threatening — a lapsed standing is "paused", framed with a clear path back.' },
    { id: 'NTR-10', severity: 'MEDIUM', rule: 'Frame participation as contribution to the UAE’s Net Zero 2050 and landfill-diversion goals and to building the country’s first counted textile stream. Never use "region’s first" or similar claims about the platform.' },
  ],
  brand: {
    palette: {
      // Naseej identity: ink indigo ground, weave violet accent, recovery green.
      indigo: '#1F2A44',
      deepIndigo: '#141C30',
      violet: '#6B4EFF',
      green: '#2E9E7E',
      linen: '#F5F2EC',
      ink: '#121829',
    },
  },
} as const;

export type NtrFacts = typeof NTR_FACTS;

// ─────────────────────────────────────────────────────────────────
// Cached prefix builder — prepended to every agent's system prompt
// ─────────────────────────────────────────────────────────────────

export function buildCachedFactsPrefix(): string {
  const f = NTR_FACTS;
  const t = f.baseline.nationalTotals;

  const regionTable = [
    '| Emirate | Baseline | Textile waste (t/yr) | Landfilled (t) | Carpet (t) | Apparel (t) | Hospitality (t) |',
    '|---|---|---|---|---|---|---|',
    ...f.regions.map(
      (r) =>
        `| ${r.nameEn} (${r.nameAr}) | ${r.baselineQuality} | ${r.textileWasteTons.toLocaleString('en-US')} | ${r.landfilledTons.toLocaleString('en-US')} | ${r.carpetTons.toLocaleString('en-US')} | ${r.apparelTons.toLocaleString('en-US')} | ${r.hospitalityTextileTons.toLocaleString('en-US')} |`,
    ),
  ].join('\n');

  const tierList = f.tiers
    .map((tier) => `- **${tier.nameEn} / ${tier.nameAr}** — earned by: ${tier.earnedBy}. Unlocks: ${tier.unlocks}`)
    .join('\n');

  const rules = f.hardRules.map((r) => `[${r.id} · ${r.severity}] ${r.rule}`).join('\n');

  return [
    `# ${f.identity.platformNameEn} — ${f.identity.platformNameAr}`,
    '',
    `**Who runs this:** ${f.identity.authority}`,
    '',
    `**Mission:** ${f.identity.mission}`,
    '',
    `**Operating principle:** ${f.identity.principle}`,
    '',
    '## Hard rules (non-negotiable, inherited by every agent)',
    '',
    rules,
    '',
    '## Participant taxonomy',
    '',
    f.taxonomy.partnerTypes
      .map((p) => `- ${p.code}: ${p.en} / ${p.ar}${p.subtypes.length ? ` (subtypes: ${p.subtypes.join(', ')})` : ''}`)
      .join('\n'),
    '',
    'Textile streams: ' + f.taxonomy.wasteStreams.map((w) => `${w.code} (${w.en} / ${w.ar})`).join(', '),
    'Fates: ' + f.taxonomy.wasteFates.join(', ') + ` (diverted = ${f.taxonomy.divertedFates.join(', ')})`,
    '',
    'Grading: ' + f.taxonomy.grading,
    '',
    '## Membership tier ladder (standing is HELD, not owned — it decays without reporting)',
    '',
    tierList,
    '',
    '## Membership lifecycle (annual renewal + standing decay)',
    '',
    f.membership.annualRenewal,
    f.membership.standingLadder,
    f.membership.tone,
    '',
    '## UAE baseline (reported national totals + indicative allocations — see caveats, NTR-7)',
    '',
    `National textile waste: ~${t.textileWasteTons.toLocaleString('en-US')} t/yr (reported June 2026, approx.) · ~${Math.round(t.landfillShare * 100)}% to landfill (~${t.landfilledTons.toLocaleString('en-US')} t) · ~${(t.textileItemsConsumedPerYear / 1_000_000).toLocaleString('en-US')} million textile items consumed per year · Indicative splits: carpet ${t.carpetTons.toLocaleString('en-US')} t, apparel ${t.apparelTons.toLocaleString('en-US')} t, hospitality ${t.hospitalityTextileTons.toLocaleString('en-US')} t, other ${t.otherTextileTons.toLocaleString('en-US')} t · Recycler, sorter and collection-point counts: not centrally published — the network's first data campaign`,
    '',
    regionTable,
    '',
    'Caveats: ' + f.baseline.caveats.join(' '),
    '',
    '## Engagement doctrine',
    '',
    f.engagement.gamification,
    '',
    f.engagement.seasonalCalendar.map((s) => `- ${s.period}: ${s.focus}`).join('\n'),
    '',
    '## ESG & climate contribution',
    '',
    f.esg.principle,
    f.esg.factorCaveat,
    f.esg.agentGuidance,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────
// Per-turn dynamic blocks (inherited runtime contract)
// ─────────────────────────────────────────────────────────────────

export function buildCurrentDateBlock(now: Date = new Date()): string {
  const gst = new Date(now.getTime() + 4 * 60 * 60 * 1000); // UAE (GST) = UTC+4
  const date = gst.toISOString().slice(0, 10);
  const q = Math.floor(gst.getUTCMonth() / 3) + 1;
  return [
    '# Current date',
    `Today is ${date} (UAE time, UTC+4). Current reporting period: Q${q} ${gst.getUTCFullYear()}.`,
    'Quarterly reports for a period are due within 30 days of quarter end.',
  ].join('\n');
}

/** Weekly theme — not used in v0. Kept for runtime compatibility. */
export async function buildCurrentThemeBlock(_now: Date = new Date()): Promise<string | null> {
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Freeze / pause shims — inherited from the base platform's runtime.
// v0 launches with everything live; wire real switches later.
// ─────────────────────────────────────────────────────────────────

export interface FreezeStatus {
  active: boolean;
  reason?: string;
  liftsAt?: string;
  endsOn?: string;
}

export function getDataRoomFreezeStatus(): FreezeStatus {
  return { active: false };
}

export function getAutonomousAgentPauseStatus(): FreezeStatus {
  return { active: false };
}

export function buildAutonomousAgentPauseSkip(route: string) {
  return {
    skipped: true,
    route,
    reason: 'Autonomous agent runs are not enabled in v0.',
  };
}

export function buildDataRoomFreezeError(): string {
  return 'Document promotion is not available.';
}

// ─────────────────────────────────────────────────────────────────
// Validation shim — structural sanity on the baseline.
// ─────────────────────────────────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING';
}
export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export function validateFacts(): ValidationResult {
  const errors: ValidationError[] = [];
  const sum = (k: keyof RegionBaselineFact) =>
    REGION_BASELINE.reduce((acc, r) => acc + ((r[k] as number | null) ?? 0), 0);
  const totals = NTR_FACTS.baseline.nationalTotals;
  // Working-set totals must equal the region table (within rounding).
  const checks: Array<[string, number, number]> = [
    ['workingSetTextileWasteTons', sum('textileWasteTons'), totals.workingSetTextileWasteTons],
    ['workingSetLandfilledTons', sum('landfilledTons'), totals.workingSetLandfilledTons],
    ['carpetTons', sum('carpetTons'), totals.carpetTons],
    ['apparelTons', sum('apparelTons'), totals.apparelTons],
    ['hospitalityTextileTons', sum('hospitalityTextileTons'), totals.hospitalityTextileTons],
    ['otherTextileTons', sum('otherTextileTons'), totals.otherTextileTons],
  ];
  for (const [path, got, want] of checks) {
    if (Math.abs(got - want) / want > 0.005) {
      errors.push({ path, message: `regional sum ${got} deviates from working-set total ${want}`, severity: 'CRITICAL' });
    }
  }
  // Each row's stream split must add up to the row.
  for (const r of REGION_BASELINE) {
    const parts = r.carpetTons + r.apparelTons + r.hospitalityTextileTons + r.otherTextileTons;
    if (Math.abs(parts - r.textileWasteTons) / r.textileWasteTons > 0.005) {
      errors.push({ path: `${r.code}.streams`, message: `stream split ${parts} deviates from row total ${r.textileWasteTons}`, severity: 'CRITICAL' });
    }
  }
  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────
// Back-compat aliases — the runtime imported these names historically.
// ─────────────────────────────────────────────────────────────────

export { NTR_FACTS as PLATFORM_FACTS };
export type PlatformFacts = typeof NTR_FACTS;

