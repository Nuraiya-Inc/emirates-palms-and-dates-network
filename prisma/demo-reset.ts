/**
 * Demo reset — makes the live-demo arc repeatable.
 *
 * The rehearsed demo submits the CURRENT quarter's diversion report for the
 * demo hotel group (Marina Crescent Hotels, NTR-DXB-00001) through Noura.
 * Without a reset, the second rehearsal fails: the report already exists and
 * Noura (correctly) says so.
 *
 * This script deletes ONLY what a rehearsal creates:
 *   - the demo hotel's current-quarter report (+ activity/waste records, cascade)
 *   - pickup tickets opened during rehearsal (keeps the seeded one)
 *   - applications/suggestions submitted during rehearsal (keeps seeded ones)
 *   - the demo hotel user's chat threads with Noura (fresh conversation)
 * It KEEPS: profile facts (never-ask-twice is part of the demo), the four
 * quarters of approved history, tiers, transfers, announcements.
 *
 * Usage: npm run demo:reset   (safe to run any number of times)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_REGISTRY = 'NTR-DXB-00001';
const DIRECTOR_SLUG = 'nou-00';

async function main() {
  const partner = await prisma.partner.findUnique({ where: { registryNo: DEMO_REGISTRY } });
  if (!partner) {
    console.log(`Demo partner ${DEMO_REGISTRY} not found — run npm run db:seed first.`);
    return;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;

  // 1. Current-quarter report (activity/waste records cascade with it)
  const del = await prisma.quarterlyReport.deleteMany({
    where: { partnerId: partner.id, year, quarter },
  });
  console.log(`✔ current-quarter report (${year} Q${quarter}): ${del.count} removed`);

  // 2. Rehearsal pickup tickets — keep the original seeded ticket by
  //    keeping the OLDEST one and removing anything newer that is still open.
  const tickets = await prisma.collectionTicket.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'asc' },
  });
  if (tickets.length > 1) {
    const extra = tickets.slice(1).filter((t) => t.status === 'OPEN' || t.status === 'CLAIMED');
    for (const t of extra) await prisma.collectionTicket.delete({ where: { id: t.id } });
    console.log(`✔ rehearsal tickets: ${extra.length} removed (seeded ticket kept)`);
  } else {
    console.log('✔ rehearsal tickets: none to remove');
  }

  // 3. Rehearsal applications/suggestions — keep the seeded demo
  //    applications (identified by the [SEED] tag in the title).
  const apps = await prisma.application.deleteMany({
    where: { partnerId: partner.id, NOT: { title: { startsWith: '[SEED]' } } },
  });
  console.log(`✔ rehearsal applications: ${apps.count} removed`);
  const sugg = await prisma.suggestion.deleteMany({
    where: { partnerId: partner.id, NOT: { body: { startsWith: '[SEED]' } } },
  });
  console.log(`✔ rehearsal suggestions: ${sugg.count} removed`);

  // 4. Fresh Noura conversation for the demo hotel user
  if (partner.userId) {
    const noura = await prisma.agent.findUnique({ where: { slug: DIRECTOR_SLUG } });
    if (noura) {
      const threads = await prisma.chatThread.deleteMany({
        where: { userId: partner.userId, agentId: noura.id },
      });
      console.log(`✔ Noura chat threads for demo hotel: ${threads.count} removed`);
    }
  }

  console.log('🔁 Demo reset complete — the arc can run again from the top.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
