/**
 * Smoke-test the resolve_quantity executor + record_waste provenance gate.
 * No Anthropic key needed — calls the executor functions directly.
 *
 * Needs: npm run db:seed, then npx tsx scripts/seed-arabic-demo.ts (DRAFT report).
 */

import { PrismaClient } from '@prisma/client';
import {
  executeResolveQuantity,
  executeRecordWaste,
} from '../src/lib/tool-catalog';

const prisma = new PrismaClient();

const DEMO_PARTNER_EMAIL = 'demo.hotel@partners.naseej.nuraiya.ai';
const DEMO_REGISTRY = 'NTR-DXB-00001';
const DIRECTOR_SLUG = 'nou-00';

async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: DEMO_PARTNER_EMAIL },
  });
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { registryNo: DEMO_REGISTRY },
  });
  const agent = await prisma.agent.findUniqueOrThrow({ where: { slug: DIRECTOR_SLUG } });
  const report = await prisma.quarterlyReport.findFirstOrThrow({
    where: { partnerId: partner.id, status: 'DRAFT' },
    orderBy: { createdAt: 'desc' },
  });

  const beforeR = await prisma.quantityResolution.count();
  const beforeW = await prisma.wasteRecord.count();

  const ctx = {
    agent,
    user,
    threadId: 'test-thread-001',
    consultationDepth: 0,
    currentMessageId: 'test-message-001',
    currentAttachmentDocIds: [],
  };

  // 1. Explicit resolve_quantity on a dialect utterance (ambiguous unit: bales)
  const res = await executeResolveQuantity(
    { raw_text: 'عندنا عشر بالات ملايات تبرعنا فيها', kind: 'WASTE' },
    ctx,
  );
  console.log('resolve_quantity result:', res.text);

  // 2. record_waste gate — no resolution_id, only raw_text. Executor
  // should resolve inline and then create a waste record linked to it.
  const rec = await executeRecordWaste(
    { report_id: report.id, raw_text: 'طن ونص سجاد ممرات رحنا فيه للمكب' },
    ctx,
  );
  console.log('record_waste result:', rec.isError ? `ERROR: ${rec.text}` : rec.text);

  const afterR = await prisma.quantityResolution.count();
  const afterW = await prisma.wasteRecord.count();
  console.log(`QuantityResolutions: ${beforeR} → ${afterR}`);
  console.log(`WasteRecords: ${beforeW} → ${afterW}`);

  const lastResolution = await prisma.quantityResolution.findFirst({
    orderBy: { id: 'desc' },
  });
  const lastWaste = await prisma.wasteRecord.findFirst({
    orderBy: { id: 'desc' },
    include: { resolution: true },
  });
  console.log('Last resolution rawText:', lastResolution?.rawText);
  console.log('Last waste linked resolution:', lastWaste?.resolution?.id);
  console.log('Last waste reportId:', lastWaste?.reportId);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
