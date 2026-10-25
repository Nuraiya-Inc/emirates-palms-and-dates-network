/**
 * Arabic-native demo seed — minimal data to exercise the
 * resolve_quantity → record_* provenance gate end-to-end.
 *
 *   npx tsx scripts/seed-arabic-demo.ts
 *
 * Creates (idempotent):
 *   1. A DRAFT QuarterlyReport for the CURRENT quarter on
 *      Marina Crescent Hotels (NTR-DXB-00001 — the partner with the
 *      portal login demo.hotel@partners.naseej.nuraiya.ai). record_* tools
 *      only write to DRAFT/RETURNED reports; everything from the other
 *      seeds is APPROVED, so without this the gate has nothing to write to.
 *   2. One example QuantityResolution + WasteRecord pair so the audit
 *      chain (figure → resolution → partner's words) is visible in
 *      queries/UI before any chat happens.
 *
 * Run AFTER npm run db:seed (needs the partner to exist).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOTEL_REGISTRY = 'NTR-DXB-00001'; // Marina Crescent Hotels — portal login partner
const EXAMPLE_RAW = 'عندنا عشر بالات ملايات وفوط قديمة من التجديد، تبرعنا فيها في رمضان';

async function main() {
  const partner = await prisma.partner.findUnique({ where: { registryNo: HOTEL_REGISTRY } });
  if (!partner) {
    throw new Error(`${HOTEL_REGISTRY} not found — run npm run db:seed first.`);
  }

  // Current quarter from "now"
  const now = new Date();
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;

  // ── 1. DRAFT report for the current quarter ────────────────
  let report = await prisma.quarterlyReport.findFirst({
    where: { partnerId: partner.id, year, quarter },
  });
  if (!report) {
    report = await prisma.quarterlyReport.create({
      data: { partnerId: partner.id, year, quarter, status: 'DRAFT' },
    });
    console.log(`✔ DRAFT report ${year} Q${quarter} for ${partner.registryNo} (${report.id})`);
  } else {
    console.log(`↺ Report ${year} Q${quarter} already exists (${report.id}, status=${report.status})`);
  }

  // ── 2. One example resolution → waste record pair ──────────
  const existing = await prisma.quantityResolution.findFirst({
    where: { rawText: EXAMPLE_RAW },
  });
  if (existing) {
    console.log('↺ Example QuantityResolution already present — nothing to do.');
    return;
  }

  const resolution = await prisma.quantityResolution.create({
    data: {
      rawText: EXAMPLE_RAW,
      normalized: 'عندنا 10 بالات ملايات وفوط قديمة من التجديد تبرعنا فيها في رمضان',
      kgLow: 1000, kgHigh: 5000, kgMid: 2500,
      count: 10,
      unitCode: 'BALE',
      quantityIndicative: true,
      stream: 'HOSPITALITY_TEXTILE', streamMatched: 'ملايات',
      fate: 'DONATED', fateMatched: 'تبرعنا',
      materialType: 'cotton',
      periodYear: year, periodQuarter: quarter, periodBasis: 'HIJRI',
      confidence: 'LOW',
      neededClarification: true,
      clarifyQuestion: 'البالة مكبوسة (300 إلى 500 كغ) ولا كيس كبير (حوالي 100 كغ)؟',
      source: 'CHAT_TEXT',
      notes: [
        'number word "عشر" → 10 bales',
        'INDICATIVE. "بالة" ranges from a loose sack to a pressed bale; ask unless the partner gives a weight or press type.',
        'period: رمضان → Hijri month mapped to the Gregorian quarter (HIJRI, MEDIUM)',
      ],
    },
  });

  await prisma.wasteRecord.create({
    data: {
      reportId: report.id,
      stream: 'HOSPITALITY_TEXTILE',
      fate: 'DONATED',
      tons: resolution.kgMid! / 1000,
      notes: 'Seeded example — figure traceable via resolutionId.',
      resolutionId: resolution.id,
    },
  });

  console.log(`✔ Example resolution ${resolution.id} → waste record (2.5t HOSPITALITY_TEXTILE→DONATED, flagged MUST_CLARIFY)`);
  console.log('\nSmoke test: log in as demo.hotel@partners.naseej.nuraiya.ai, open Noura, send:');
  console.log('  "عندنا عشر بالات ملايات تبرعنا فيها" — expect resolve_quantity + a dialect clarifier.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
