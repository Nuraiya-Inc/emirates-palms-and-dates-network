/**
 * Demo-data seed — makes the platform LOOK ALIVE for the pitch.
 *
 * Adds a few extra registry partners and four quarters of APPROVED diversion
 * reports with realistic, non-uniform figures, plus chain-of-custody edges
 * (MaterialTransfer) from sources into the network's recyclers, sorter and
 * charity, receiving-side reports for the offtakers, tier advancements, a
 * couple of pickup tickets and marketplace listings.
 *
 * Idempotent: skips entirely if demo reports already exist.
 *
 * Usage: npm run db:seed-demo   (AFTER npm run db:seed)
 * Demo data only — wipe before any real partner onboarding.
 * All tonnages are FICTIONAL demo figures.
 */

import { PrismaClient, PartnerType, PartnerSizeClass, PartnerTier, Region, WasteStream, WasteFate } from '@prisma/client';

const prisma = new PrismaClient();

const PERIODS: Array<[number, number]> = [[2025, 3], [2025, 4], [2026, 1], [2026, 2]];

// Registry numbers from prisma/seed.ts
const HOTEL = 'NTR-DXB-00001';        // Marina Crescent Hotels (HOSPITALITY, portal login)
const FM = 'NTR-DXB-00002';           // Burj Line Facilities Management (FACILITY)
const INSTALLER = 'NTR-DXB-00003';    // Al Khaleej Flooring Contractors (INSTALLER)
const POLYMER = 'NTR-DXB-00004';      // Gulf Polymer Recovery (RECYCLER / POLYMER)
const FIBRE = 'NTR-AUH-00001';        // Mussafah Fibre Works (RECYCLER / FIBER)
const SORTER = 'NTR-SHJ-00001';       // Hamriyah Textile Sorting (SORTER)
const CHARITY = 'NTR-AUH-00002';      // Al Khair Clothing Bank (CHARITY)
const RETAILER = 'NTR-DXB-00005';     // Souq Line Retail Group (RETAILER)
const DIVERSION = 'NTR-DXB-00006';    // Al Lisaili Diversion Unit (DIVERSION_UNIT)
const MANUFACTURER = 'NTR-DXB-00007'; // Emirates Loom Flooring (MANUFACTURER)

// Extra demo partners (no portal logins — registry texture)
const EXTRAS = [
  { registryNo: 'NTR-AUH-00004', nameEn: 'Corniche Bay Resorts', nameAr: 'منتجعات خليج الكورنيش', type: PartnerType.HOSPITALITY, subtype: 'HOTEL', sizeClass: PartnerSizeClass.MEDIUM, region: Region.ABU_DHABI, city: 'Abu Dhabi', units: 620 },
  { registryNo: 'NTR-AUH-00005', nameEn: 'Yas Fit-Out Interiors', nameAr: 'ياس للتجهيزات الداخلية', type: PartnerType.INSTALLER, sizeClass: PartnerSizeClass.SMALL, region: Region.ABU_DHABI, city: 'Abu Dhabi', units: 3 },
  { registryNo: 'NTR-SHJ-00002', nameEn: 'Al Nahda Laundry Services', nameAr: 'النهضة لخدمات الغسيل', type: PartnerType.FACILITY, sizeClass: PartnerSizeClass.MEDIUM, region: Region.SHARJAH, city: 'Sharjah', units: 9 },
  { registryNo: 'NTR-DXB-00008', nameEn: 'Jumeirah Coast Hotel Collection', nameAr: 'مجموعة فنادق ساحل جميرا', type: PartnerType.HOSPITALITY, subtype: 'HOTEL', sizeClass: PartnerSizeClass.LARGE, region: Region.DUBAI, city: 'Dubai', units: 1460 },
  { registryNo: 'NTR-RAK-00001', nameEn: 'Hajar Mountain Lodges', nameAr: 'نُزل جبال الحجر', type: PartnerType.HOSPITALITY, subtype: 'HOTEL', sizeClass: PartnerSizeClass.SMALL, region: Region.RAS_AL_KHAIMAH, city: 'Ras Al Khaimah', units: 140 },
];

interface Line {
  stream: WasteStream;
  fate: WasteFate;
  tons: number;
  /** Receiving partner registry — creates a MaterialTransfer edge. */
  to?: string;
}

interface SourceProfile {
  units?: number;
  materialTypes: string[];
  /** Per quarter: textile generated (t) and the fate lines for it. */
  quarters: Array<{ generated: number; lines: Line[] }>;
}

// Source-side profiles (tons per quarter, deliberately non-uniform;
// Q1 = refurbishment season, Q3 = quieter summer).
const SOURCES: Record<string, SourceProfile> = {
  [HOTEL]: {
    units: 1180,
    materialTypes: ['nylon 6', 'poly-cotton', 'cotton'],
    quarters: [
      { generated: 38, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 6.4, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 9.1, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 14.2, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 5.3 },
        { stream: WasteStream.OTHER, fate: WasteFate.UNKNOWN, tons: 3.0 },
      ] },
      { generated: 52, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 8.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 11.6, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 22.5, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 7.4 },
        { stream: WasteStream.OTHER, fate: WasteFate.LANDFILLED, tons: 2.5 },
      ] },
      { generated: 96, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 7.2, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 12.8, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 61.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 11.0 },
        { stream: WasteStream.OTHER, fate: WasteFate.DOWNCYCLED, tons: 4.0, to: FIBRE },
      ] },
      { generated: 44, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 9.5, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 10.2, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 18.6, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 3.9 },
        { stream: WasteStream.OTHER, fate: WasteFate.UNKNOWN, tons: 1.8 },
      ] },
    ],
  },
  [FM]: {
    units: 62,
    materialTypes: ['nylon 6,6', 'poly-cotton', 'polyester'],
    quarters: [
      { generated: 27, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 12.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 6.5 },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.DOWNCYCLED, tons: 3.2, to: FIBRE },
        { stream: WasteStream.TECHNICAL_TEXTILE, fate: WasteFate.LANDFILLED, tons: 5.3 },
      ] },
      { generated: 31, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 15.5, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 5.0 },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.DOWNCYCLED, tons: 4.1, to: FIBRE },
        { stream: WasteStream.TECHNICAL_TEXTILE, fate: WasteFate.LANDFILLED, tons: 6.4 },
      ] },
      { generated: 58, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 36.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 9.0 },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.DOWNCYCLED, tons: 5.0, to: FIBRE },
        { stream: WasteStream.TECHNICAL_TEXTILE, fate: WasteFate.DOWNCYCLED, tons: 8.0, to: FIBRE },
      ] },
      { generated: 35, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 20.4, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 4.6 },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.DOWNCYCLED, tons: 4.0, to: FIBRE },
        { stream: WasteStream.TECHNICAL_TEXTILE, fate: WasteFate.LANDFILLED, tons: 6.0 },
      ] },
    ],
  },
  [INSTALLER]: {
    units: 14,
    materialTypes: ['nylon 6,6', 'PP', 'polyolefin backing'],
    quarters: [
      { generated: 64, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 28.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 14.0 },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 6.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 16.0 },
      ] },
      { generated: 81, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 40.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 12.5 },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 7.5, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 21.0 },
      ] },
      { generated: 142, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 78.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 18.0 },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 11.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 20.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 15.0 },
      ] },
      { generated: 73, lines: [
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.RECYCLED_POLYMER, tons: 39.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_TILE, fate: WasteFate.LANDFILLED, tons: 9.0 },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 8.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 10.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 7.0 },
      ] },
    ],
  },
  [RETAILER]: {
    units: 41,
    materialTypes: ['cotton', 'polyester', 'poly-cotton'],
    quarters: [
      { generated: 19, lines: [
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.DONATED, tons: 5.5, to: CHARITY },
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.EXPORTED, tons: 6.0, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.RECYCLED_FIBER, tons: 4.5, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.LANDFILLED, tons: 3.0 },
      ] },
      { generated: 26, lines: [
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.DONATED, tons: 7.0, to: CHARITY },
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.EXPORTED, tons: 9.0, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.RECYCLED_FIBER, tons: 6.0, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.LANDFILLED, tons: 4.0 },
      ] },
      { generated: 33, lines: [
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.DONATED, tons: 12.0, to: CHARITY },
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.EXPORTED, tons: 10.0, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.RECYCLED_FIBER, tons: 7.5, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.LANDFILLED, tons: 3.5 },
      ] },
      { generated: 22, lines: [
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.DONATED, tons: 6.0, to: CHARITY },
        { stream: WasteStream.APPAREL_WEARABLE, fate: WasteFate.EXPORTED, tons: 8.0, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.RECYCLED_FIBER, tons: 5.5, to: SORTER },
        { stream: WasteStream.APPAREL_NONWEARABLE, fate: WasteFate.LANDFILLED, tons: 2.5 },
      ] },
    ],
  },
  [MANUFACTURER]: {
    units: 1,
    materialTypes: ['nylon 6', 'polyolefin backing'],
    quarters: [
      { generated: 21, lines: [
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 17.0, to: POLYMER },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.LANDFILLED, tons: 4.0 },
      ] },
      { generated: 24, lines: [
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 21.0, to: POLYMER },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.LANDFILLED, tons: 3.0 },
      ] },
      { generated: 29, lines: [
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 27.5, to: POLYMER },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.LANDFILLED, tons: 1.5 },
      ] },
      { generated: 25, lines: [
        { stream: WasteStream.PI_CARPET, fate: WasteFate.RECYCLED_POLYMER, tons: 24.0, to: POLYMER },
        { stream: WasteStream.PI_CARPET, fate: WasteFate.LANDFILLED, tons: 1.0 },
      ] },
    ],
  },
  'NTR-AUH-00004': {
    units: 620,
    materialTypes: ['poly-cotton', 'cotton', 'nylon 6'],
    quarters: [
      { generated: 14, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 3.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 4.0, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 7.0 },
      ] },
      { generated: 17, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 3.5, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 5.5, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 8.0 },
      ] },
      { generated: 41, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 4.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 6.0, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 25.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 6.0 },
      ] },
      { generated: 15, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 4.5, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 6.5, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 4.0 },
      ] },
    ],
  },
  'NTR-DXB-00008': {
    units: 1460,
    materialTypes: ['poly-cotton', 'cotton', 'nylon 6', 'wool blend'],
    quarters: [
      { generated: 46, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 9.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 12.0, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 15.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 10.0 },
      ] },
      { generated: 58, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 11.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 14.0, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 22.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 11.0 },
      ] },
      { generated: 112, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 10.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 16.0, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 70.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 16.0 },
      ] },
      { generated: 51, lines: [
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.DONATED, tons: 12.0, to: CHARITY },
        { stream: WasteStream.HOSPITALITY_TEXTILE, fate: WasteFate.RECYCLED_FIBER, tons: 15.0, to: FIBRE },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.RECYCLED_POLYMER, tons: 18.0, to: POLYMER },
        { stream: WasteStream.PC_CARPET_BROADLOOM, fate: WasteFate.LANDFILLED, tons: 6.0 },
      ] },
    ],
  },
};

// Offtakers that file receiving-side reports (received = sum of inbound
// transfers; recovered = what left them to a productive fate).
const OFFTAKERS: Record<string, { capacity: number; materialTypes: string[]; recoveredShare: number; outStream: WasteStream; outFate: WasteFate; residueFate: WasteFate }> = {
  [POLYMER]: { capacity: 1500, materialTypes: ['nylon 6', 'nylon 6,6', 'PP'], recoveredShare: 0.82, outStream: WasteStream.PC_CARPET_TILE, outFate: WasteFate.RECYCLED_POLYMER, residueFate: WasteFate.LANDFILLED },
  [FIBRE]: { capacity: 600, materialTypes: ['cotton', 'poly-cotton'], recoveredShare: 0.88, outStream: WasteStream.HOSPITALITY_TEXTILE, outFate: WasteFate.RECYCLED_FIBER, residueFate: WasteFate.LANDFILLED },
  [SORTER]: { capacity: 2250, materialTypes: ['cotton', 'polyester'], recoveredShare: 0.9, outStream: WasteStream.APPAREL_WEARABLE, outFate: WasteFate.EXPORTED, residueFate: WasteFate.LANDFILLED },
  [CHARITY]: { capacity: 120, materialTypes: ['cotton', 'poly-cotton'], recoveredShare: 0.93, outStream: WasteStream.APPAREL_WEARABLE, outFate: WasteFate.REUSED, residueFate: WasteFate.DOWNCYCLED },
};

const r1 = (n: number) => Math.round(n * 10) / 10;

async function main() {
  const marker = await prisma.quarterlyReport.findFirst({
    where: { partner: { registryNo: HOTEL } },
  });
  if (marker) {
    console.log('Demo data already present — nothing to do.');
    return;
  }

  console.log('🎬 Seeding demo activity…');

  for (const e of EXTRAS) {
    const { units, ...data } = e;
    await prisma.partner.upsert({
      where: { registryNo: e.registryNo },
      update: {},
      create: {
        ...data,
        foundingMember: true,
        profileFacts: units ? ({ units } as never) : undefined,
      },
    });
  }
  console.log(`   ✔ ${EXTRAS.length} extra registry partners`);

  const byRegistry = new Map<string, { id: string; registryNo: string; tier: PartnerTier }>();
  for (const p of await prisma.partner.findMany({ select: { id: true, registryNo: true, tier: true } })) {
    byRegistry.set(p.registryNo, p);
  }

  // Inbound tonnes per offtaker per period (from the source lines above)
  const inbound = new Map<string, number[]>();
  const addInbound = (to: string, i: number, tons: number) => {
    const arr = inbound.get(to) ?? [0, 0, 0, 0];
    arr[i] = r1(arr[i] + tons);
    inbound.set(to, arr);
  };

  let reports = 0;
  let transfers = 0;
  for (const [registryNo, p] of Object.entries(SOURCES)) {
    const partner = byRegistry.get(registryNo);
    if (!partner) continue;

    for (let i = 0; i < PERIODS.length; i++) {
      const [year, quarter] = PERIODS[i];
      const q = p.quarters[i];
      const submitted = new Date(Date.UTC(year, quarter * 3 - 1, 20 + (i % 3)));
      const recovered = r1(
        q.lines
          .filter((l) => !['INCINERATED', 'LANDFILLED', 'UNKNOWN'].includes(l.fate))
          .reduce((a, l) => a + l.tons, 0),
      );

      const report = await prisma.quarterlyReport.create({
        data: {
          partnerId: partner.id,
          year,
          quarter,
          status: 'APPROVED',
          confidenceScore: 82 + ((i * 5 + registryNo.length) % 15),
          validationNotes: 'CHECKED: history, unit priors (kg per m2, kg per room), chain of custody against offtaker intake. DEVIATIONS: none material. RECOMMENDATION: approve.',
          submittedAt: submitted,
          validatedAt: new Date(submitted.getTime() + 3600e3),
          approvedAt: new Date(submitted.getTime() + 26 * 3600e3),
        },
      });
      reports++;

      await prisma.productionRecord.create({
        data: {
          reportId: report.id,
          unitsCount: p.units ?? null,
          textileGeneratedTons: q.generated,
          textileRecoveredTons: recovered,
          materialTypes: p.materialTypes,
        },
      });

      for (const line of q.lines) {
        await prisma.wasteRecord.create({
          data: {
            reportId: report.id,
            stream: line.stream,
            fate: line.fate,
            tons: line.tons,
            destinationRegistryNo: line.to ?? null,
          },
        });
        if (line.to) {
          const dest = byRegistry.get(line.to);
          if (dest) {
            await prisma.materialTransfer.create({
              data: {
                fromPartnerId: partner.id, toPartnerId: dest.id,
                stream: line.stream, tons: line.tons, year, quarter, reconciled: true,
              },
            });
            transfers++;
            addInbound(line.to, i, line.tons);
          }
        }
      }
    }
  }
  console.log(`   ✔ ${reports} approved source reports, ${transfers} chain-of-custody transfers`);

  // Offtaker (receiving-side) reports
  let offtakerReports = 0;
  for (const [registryNo, o] of Object.entries(OFFTAKERS)) {
    const partner = byRegistry.get(registryNo);
    const received = inbound.get(registryNo);
    if (!partner || !received) continue;
    for (let i = 0; i < PERIODS.length; i++) {
      const [year, quarter] = PERIODS[i];
      const inTons = received[i];
      if (!inTons) continue;
      const submitted = new Date(Date.UTC(year, quarter * 3 - 1, 24));
      const r = await prisma.quarterlyReport.create({
        data: {
          partnerId: partner.id, year, quarter, status: 'APPROVED',
          confidenceScore: 90, submittedAt: submitted,
          validatedAt: submitted, approvedAt: new Date(submitted.getTime() + 20 * 3600e3),
          validationNotes: 'CHECKED: inbound tonnes reconcile with source-side transfers within tolerance.',
        },
      });
      const out = r1(inTons * o.recoveredShare);
      const residue = r1(inTons - out);
      await prisma.productionRecord.create({
        data: {
          reportId: r.id,
          textileGeneratedTons: inTons,
          textileRecoveredTons: out,
          processingCapacityTons: o.capacity,
          materialTypes: o.materialTypes,
          notes: 'Received tonnes from network sources; recovered = output to productive fate.',
        },
      });
      await prisma.wasteRecord.create({ data: { reportId: r.id, stream: o.outStream, fate: o.outFate, tons: out } });
      if (residue > 0) {
        await prisma.wasteRecord.create({
          data: { reportId: r.id, stream: o.outStream, fate: o.residueFate, tons: residue, notes: 'Contamination and reject fraction.' },
        });
      }
      offtakerReports++;
    }
  }
  console.log(`   ✔ ${offtakerReports} offtaker receiving reports`);

  // Tier advancements earned by the history above
  const promote: Array<[string, 'ACTIVE' | 'CERTIFIED']> = [
    [HOTEL, 'CERTIFIED'],
    [INSTALLER, 'CERTIFIED'],
    [POLYMER, 'CERTIFIED'],
    [FM, 'ACTIVE'],
    [RETAILER, 'ACTIVE'],
    [MANUFACTURER, 'ACTIVE'],
    [FIBRE, 'ACTIVE'],
    [SORTER, 'ACTIVE'],
    [CHARITY, 'ACTIVE'],
    ['NTR-DXB-00008', 'ACTIVE'],
    ['NTR-AUH-00004', 'ACTIVE'],
  ];
  for (const [registryNo, tier] of promote) {
    const partner = byRegistry.get(registryNo);
    if (!partner) continue;
    await prisma.partner.update({ where: { id: partner.id }, data: { tier } });
    await prisma.tierEvent.create({
      data: {
        partnerId: partner.id, fromTier: partner.tier, toTier: tier,
        fromStanding: 'GOOD', toStanding: 'GOOD',
        reason: 'Demo: consecutive approved quarterly diversion reports',
      },
    });
  }
  console.log(`   ✔ ${promote.length} tier advancements`);

  // Pickup tickets and marketplace listings (texture for the network pages)
  const fm = byRegistry.get(FM);
  const installer = byRegistry.get(INSTALLER);
  const retailer = byRegistry.get(RETAILER);
  const diversion = byRegistry.get(DIVERSION);
  const polymer = byRegistry.get(POLYMER);
  const sorter = byRegistry.get(SORTER);
  const haulier = byRegistry.get('NTR-AUH-00003');

  if (fm && installer && retailer) {
    await prisma.collectionTicket.createMany({
      data: [
        {
          partnerId: fm.id, stream: 'PC_CARPET_TILE', estimatedTons: 6.5, region: 'DUBAI', city: 'Dubai',
          locationNote: 'Tower 2 basement, 1,400 m2 of tile stacked on 9 pallets, nylon face, polyolefin backing',
          status: 'CLAIMED', claimedByPartnerId: haulier?.id ?? null, claimedAt: new Date(Date.UTC(2026, 8, 3)),
        },
        {
          partnerId: installer.id, stream: 'PC_CARPET_BROADLOOM', estimatedTons: 3.1, region: 'DUBAI', city: 'Business Bay',
          locationNote: 'Office strip-out, 700 m2 of broadloom in rolls, latex backing, light contamination',
          status: 'OPEN',
        },
        {
          partnerId: retailer.id, stream: 'APPAREL_WEARABLE', estimatedTons: 1.2, region: 'DUBAI', city: 'Deira',
          locationNote: 'Back-of-house, 34 bags of staff uniforms and take-back apparel',
          status: 'COLLECTED', claimedByPartnerId: sorter?.id ?? null,
          claimedAt: new Date(Date.UTC(2026, 7, 18)), collectedAt: new Date(Date.UTC(2026, 7, 21)), actualTons: 1.35,
        },
      ],
    });
    console.log('   ✔ 3 pickup tickets');
  }

  if (polymer && sorter && diversion) {
    await prisma.listing.createMany({
      data: [
        {
          partnerId: polymer.id, category: 'RECYCLED_PRODUCTS', title: 'Recycled PP pellets from carpet backing, 12 tons',
          qtyTons: 12, askPriceAed: 36000, region: 'DUBAI',
          notes: 'Natural grey, MFI on request, bagged 25 kg. From network PC carpet tile.',
        },
        {
          partnerId: sorter.id, category: 'FIBER_FEEDSTOCK', title: 'Sorted cotton-rich non-wearables, 18 tons, baled',
          qtyTons: 18, askPriceAed: 9000, region: 'SHARJAH',
          notes: 'Buttons and zips removed, 400 kg bales, suitable for pulling or wipers.',
        },
        {
          partnerId: diversion.id, category: 'CARPET_PC', title: 'Mixed post-consumer carpet pick-out, 30 tons, ungraded',
          qtyTons: 30, askPriceAed: 0, region: 'DUBAI',
          notes: 'Transfer station pick-out, mixed backing. Free to a network recycler who grades on site.',
        },
      ],
    });
    console.log('   ✔ 3 marketplace listings');
  }

  // Applications + a suggestion — so the portal Applications page and the
  // staff Network Inbox have life in the demo. [SEED] tag protects them from
  // npm run demo:reset.
  const hotel = byRegistry.get(HOTEL);
  if (hotel) {
    await prisma.application.create({
      data: {
        partnerId: hotel.id, kind: 'AWARD', status: 'UNDER_REVIEW',
        title: '[SEED] Excellence in Textile Recovery, 2026 nomination',
        body: 'ترشيح لجائزة التميز في استعادة المنسوجات: 78% من منسوجاتنا المتقاعدة وسجادنا المُزال هذا العام وصل إلى مصير منتج عبر تذاكر الجمع الموثقة في المنصة. Nomination based on verified diversion records held by the network.',
      },
    });
    await prisma.suggestion.create({
      data: {
        partnerId: hotel.id, kind: 'IDEA',
        body: '[SEED] اقتراح: تنبيه قبل مواسم التجديد لحجز سعة الجمع مسبقاً. Pre-refurbishment alerts so pickup capacity can be booked before a strip-out starts.',
        status: 'NEW',
      },
    });
  }
  if (installer) {
    await prisma.application.create({
      data: {
        partnerId: installer.id, kind: 'GRANT', status: 'APPROVED',
        title: '[SEED] On-site carpet baler support',
        body: 'طلب دعم لمكبس سجاد متنقل لتقليل حجم الحمولات قبل النقل. Approved on the strength of four consecutive verified quarters.',
        decisionNote: 'Approved. Consistent verified reporting; equipment tied to diversion targets.',
        decidedAt: new Date(Date.UTC(2026, 5, 12)),
      },
    });
  }
  console.log('   ✔ demo applications + suggestion');

  await prisma.activityEvent.createMany({
    data: [
      { kind: 'REPORT_APPROVED', severity: 'INFO', title: `${INSTALLER} · 2026 Q1 APPROVED (142 t, largest report this quarter)`, payload: {} },
      { kind: 'TIER_CHANGE_APPLIED', severity: 'NOTABLE', title: 'Marina Crescent Hotels advanced to CERTIFIED · مبروك', payload: {} },
      { kind: 'REPORT_SUBMITTED', severity: 'INFO', title: `${RETAILER} submitted 2026 Q2 via Noura (Excel intake)`, payload: {} },
    ],
  });

  console.log('🎬 Demo seed complete — dashboards are alive.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
