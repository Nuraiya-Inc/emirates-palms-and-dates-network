/**
 * Seed default platform channels + memberships (Naseej Textile Recovery Platform).
 *
 * Run ONCE after first deploy of the channels feature:
 *   npx tsx scripts/seed-channels.ts
 *
 * Idempotent — uses upserts. Re-running just reconciles memberships.
 *
 * Channel design (7-agent roster, see src/lib/agents):
 *   #leadership      — platform owner + Noura (private)
 *   #network-ops     — intake, validation, registry: NOU-00, INT-01, VAL-01, REG-01 + staff
 *   #certification   — tier and certification drafting: CER-01, VAL-01, NOU-00 + staff
 *   #engagement      — campaigns, seasons, recognition: ENG-01, ANA-01, NOU-00 + staff
 *   #all-hands       — every user, every agent
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_EMAIL = (process.env.SEED_CEO_EMAIL ?? 'nima.vakili@kmigroup.com').toLowerCase();
const DEMO_OFFICIAL_EMAIL = 'demo.official@naseej.nuraiya.ai';

interface ChannelSpec {
  slug: string;
  name: string;
  description: string;
  isLeadership: boolean;
  /** Default responder when nobody specifically addressed — usually Noura. */
  defaultResponderSlug: string | null;
  /** Slugs of agents that should be in this channel. */
  agentSlugs: 'all' | string[];
  /** Emails of users that should be in this channel. */
  userEmails: 'all' | string[];
}

const CHANNELS: ChannelSpec[] = [
  {
    slug: 'leadership',
    name: '#leadership',
    description: 'Owner-only. Platform direction, partner strategy, hard calls.',
    isLeadership: true,
    defaultResponderSlug: 'nou-00',
    agentSlugs: ['nou-00'],
    userEmails: [OWNER_EMAIL],
  },
  {
    slug: 'network-ops',
    name: '#network-ops',
    description: 'Intake, validation and registry: load reports, chain-of-custody checks, partner records.',
    isLeadership: false,
    defaultResponderSlug: 'nou-00',
    agentSlugs: ['nou-00', 'int-01', 'val-01', 'reg-01'],
    userEmails: [OWNER_EMAIL, DEMO_OFFICIAL_EMAIL],
  },
  {
    slug: 'certification',
    name: '#certification',
    description: 'Tier changes, certification drafts and standing reviews. Agents draft, officials approve.',
    isLeadership: false,
    defaultResponderSlug: 'cer-01',
    agentSlugs: ['cer-01', 'val-01', 'nou-00'],
    userEmails: [OWNER_EMAIL, DEMO_OFFICIAL_EMAIL],
  },
  {
    slug: 'engagement',
    name: '#engagement',
    description: 'Seasonal campaigns, benchmarks, recognition and partner communications.',
    isLeadership: false,
    defaultResponderSlug: 'eng-01',
    agentSlugs: ['eng-01', 'ana-01', 'nou-00'],
    userEmails: [OWNER_EMAIL, DEMO_OFFICIAL_EMAIL],
  },
  {
    slug: 'all-hands',
    name: '#all-hands',
    description: 'Cross-functional broadcast. Everyone: every user, every agent.',
    isLeadership: false,
    defaultResponderSlug: 'nou-00',
    agentSlugs: 'all',
    userEmails: 'all',
  },
];

async function main() {
  // Find a system-creator user (the first CEO or just the first user)
  const creator = await prisma.user.findFirst({
    where: { role: 'CEO' },
    select: { id: true },
  });
  if (!creator) {
    console.error('No CEO user found — channels need a creator. Aborting.');
    process.exit(1);
  }

  // Pre-fetch all agents + users for membership resolution
  const [allAgents, allUsers] = await Promise.all([
    prisma.agent.findMany({ where: { isActive: true }, select: { id: true, slug: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, email: true } }),
  ]);

  const agentBySlug = new Map(allAgents.map((a) => [a.slug, a]));
  const userByEmail = new Map(allUsers.map((u) => [u.email, u]));

  let created = 0;
  let updated = 0;

  for (const spec of CHANNELS) {
    const defaultResponderAgentId = spec.defaultResponderSlug
      ? agentBySlug.get(spec.defaultResponderSlug)?.id
      : null;

    // Upsert the channel itself
    const existing = await prisma.channel.findUnique({ where: { slug: spec.slug } });
    const channel = existing
      ? await prisma.channel.update({
          where: { id: existing.id },
          data: {
            name: spec.name,
            description: spec.description,
            isLeadership: spec.isLeadership,
            defaultResponderAgentId: defaultResponderAgentId ?? null,
          },
        })
      : await prisma.channel.create({
          data: {
            slug: spec.slug,
            name: spec.name,
            description: spec.description,
            isLeadership: spec.isLeadership,
            defaultResponderAgentId: defaultResponderAgentId ?? null,
            createdById: creator.id,
          },
        });

    if (existing) updated++;
    else created++;

    // Resolve agent membership
    const agentsToAdd =
      spec.agentSlugs === 'all'
        ? allAgents
        : spec.agentSlugs.map((s) => agentBySlug.get(s)).filter((a): a is { id: string; slug: string } => !!a);

    for (const a of agentsToAdd) {
      await prisma.channelAgent.upsert({
        where: { channelId_agentId: { channelId: channel.id, agentId: a.id } },
        create: { channelId: channel.id, agentId: a.id, isActive: true },
        update: { isActive: true },
      });
    }

    // Resolve user membership
    const usersToAdd =
      spec.userEmails === 'all'
        ? allUsers
        : spec.userEmails.map((e) => userByEmail.get(e)).filter((u): u is { id: string; email: string } => !!u);

    for (const u of usersToAdd) {
      await prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: channel.id, userId: u.id } },
        create: { channelId: channel.id, userId: u.id, role: 'member' },
        update: {},
      });
    }

    console.log(`✓ ${spec.name} — ${agentsToAdd.length} agents, ${usersToAdd.length} users`);
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
