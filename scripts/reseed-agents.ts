/**
 * Targeted agent re-seed — refreshes ONLY the agent definitions
 * (system prompts, daily-run briefs, tools, mission, KPIs, etc.) from the
 * specs in src/lib/agents into the live database.
 *
 * Why this exists: agent prompts live in the Agent table (seeded from the
 * spec files), and the runtime reads them from the DB. Editing the .ts spec
 * files and deploying does NOT change the live prompts until the DB is
 * refreshed. This script touches ONLY the Agent table — no users, partners,
 * reports, projects or announcements are affected. It refreshes each agent's
 * definitional fields AND sets dailyRunEnabled for the roster below, so it is
 * also the "on switch" for the autonomous morning sweep.
 *
 * Roster (Naseej Textile Recovery Platform, 7 agents):
 *   nou-00 Noura (director) · int-01 · val-01 · ana-01 · cer-01 · eng-01 · reg-01
 *
 * Usage (in the Coolify app terminal, after deploying updated specs):
 *   npx tsx scripts/reseed-agents.ts
 */

import { PrismaClient } from '@prisma/client';
import { AGENT_SPECS } from '../src/lib/agents';

const prisma = new PrismaClient();

// Agents that take part in the daily sweep. Keep this in sync with the
// roster in src/lib/agents/index.ts and the cron route's branch plan.
const DAILY_RUN_SLUGS = new Set([
  'nou-00',
  'int-01', 'val-01', 'ana-01', 'cer-01', 'eng-01', 'reg-01',
]);

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const spec of AGENT_SPECS) {
    const existing = await prisma.agent.findUnique({
      where: { slug: spec.slug },
      select: { id: true },
    });
    if (!existing) {
      console.log(`  skip (agent not in DB): ${spec.slug}`);
      skipped++;
      continue;
    }

    await prisma.agent.update({
      where: { slug: spec.slug },
      data: {
        name: spec.name,
        title: spec.title,
        tier: spec.tier,
        branch: spec.branch,
        reportsToSlug: spec.reportsToSlug,
        mission: spec.mission,
        decisionRights: spec.decisionRights.trim(),
        responsibilities: spec.responsibilities.trim(),
        kpis: spec.kpis.trim(),
        tools: spec.tools.trim(),
        systemPrompt: spec.systemPrompt,
        dailyRunBrief: spec.dailyRunBrief ?? null,
        model: spec.model ?? 'claude-sonnet-4-6',
        temperature: spec.temperature ?? 0.4,
        deployPhase: spec.deployPhase,
        dailyRunEnabled: DAILY_RUN_SLUGS.has(spec.slug),
      },
    });
    updated++;
  }

  // Anything no longer in the roster is deactivated (clean fork hygiene).
  const activeSlugs = AGENT_SPECS.map((a) => a.slug);
  const retired = await prisma.agent.updateMany({
    where: { slug: { notIn: activeSlugs }, isActive: true },
    data: { isActive: false, dailyRunEnabled: false },
  });

  console.log(
    `\n✔ Refreshed ${updated}/${AGENT_SPECS.length} agent definitions (prompts, briefs, tools).` +
      (skipped ? ` Skipped ${skipped} not in DB.` : '') +
      (retired.count ? ` Deactivated ${retired.count} agents no longer in the roster.` : '') +
      ` No other data touched.`,
  );
}

main()
  .catch((e) => {
    console.error('reseed-agents failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
