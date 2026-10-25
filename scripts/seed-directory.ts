/**
 * seed-directory.ts — imports the UAE textile recovery value-chain directory
 * into the DirectoryEntry table.
 *
 * RUN (from the app root, same pattern as the existing seed):
 *   npx tsx scripts/seed-directory.ts
 *
 * INPUT: prisma/data/directory-data.json
 *   A short, verified list of real UAE organisations across the six value
 *   chain stages. Fewer accurate entries beat many invented ones: add rows
 *   only with a public source for the role claimed.
 * SAFE TO RE-RUN: upserts on (nameEn, stage) so re-imports don't duplicate.
 *
 * Field mapping from the JSON to the schema:
 *   stage string  -> ValueChainStage enum
 *   tier string   -> DirectoryPriority enum
 *   confidence    -> ConfidenceLevel enum
 *   emirate       -> Region enum (single emirate) OR null + emirateLabel
 *   relationship  -> RelationshipStatus enum (optional; default DIRECTORY)
 *   sources       -> split on " | " into String[]
 */

import {
  PrismaClient,
  ValueChainStage,
  DirectoryPriority,
  ConfidenceLevel,
  RelationshipStatus,
  Region,
} from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

interface Row {
  name: string; name_ar?: string;
  stage: string; segment?: string; also_roles?: string;
  tier: string; confidence: string;
  emirate?: string; location?: string;
  description?: string; ownership?: string;
  website?: string; phone?: string; email?: string; address?: string;
  safa_relevance?: string; sources?: string;
  relationship?: string;
}

const STAGE: Record<string, ValueChainStage> = {
  '1. Sources & Generators': 'SOURCES_GENERATORS',
  '2. Collection, Hauling & Diversion': 'COLLECTION_LOGISTICS',
  '3. Sorting, Grading & Export': 'SORTING_GRADING',
  '4. Recyclers & Processors': 'RECYCLERS_PROCESSORS',
  '5. Reuse, Charity & Resale': 'REUSE_CHARITY',
  '6. Ecosystem': 'ECOSYSTEM',
};

const PRIORITY: Record<string, DirectoryPriority> = {
  'Tier 1': 'PRIORITY_1',
  'Tier 2': 'PRIORITY_2',
  'Tier 3': 'PRIORITY_3',
};

const CONFIDENCE: Record<string, ConfidenceLevel> = {
  High: 'HIGH', Medium: 'MEDIUM', Low: 'LOW',
};

const RELATIONSHIP: Record<string, RelationshipStatus> = {
  DIRECTORY: 'DIRECTORY',
  CONTACTED: 'CONTACTED',
  ENGAGED: 'ENGAGED',
  ONBOARDING: 'ONBOARDING',
  REGISTERED: 'REGISTERED',
  DECLINED: 'DECLINED',
};

// Single-emirate values map to Region; everything else (Federal / National,
// Multi-emirate, Unconfirmed) stays null and is preserved in emirateLabel.
const REGION: Record<string, Region> = {
  'Abu Dhabi': 'ABU_DHABI',
  'Dubai': 'DUBAI',
  'Sharjah': 'SHARJAH',
  'Ajman': 'AJMAN',
  'Umm Al Quwain': 'UMM_AL_QUWAIN',
  'Ras Al Khaimah': 'RAS_AL_KHAIMAH',
  'Fujairah': 'FUJAIRAH',
};

function splitSources(s?: string): string[] {
  if (!s) return [];
  return s.split('|').map((x) => x.trim()).filter(Boolean);
}

async function main() {
  const path = join(process.cwd(), 'prisma', 'data', 'directory-data.json');
  const rows: Row[] = JSON.parse(readFileSync(path, 'utf-8'));

  let created = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const stage = STAGE[r.stage];
    const priority = PRIORITY[r.tier];
    const confidence = CONFIDENCE[r.confidence];
    if (!stage || !priority || !confidence) {
      console.warn(`[skip] unmapped enum for "${r.name}": stage=${r.stage} tier=${r.tier} conf=${r.confidence}`);
      skipped++;
      continue;
    }
    const relationship = (r.relationship && RELATIONSHIP[r.relationship]) || 'DIRECTORY';

    const data = {
      nameEn: r.name,
      nameAr: r.name_ar || null,
      stage,
      segment: r.segment || 'Unspecified',
      alsoRoles: r.also_roles || null,
      priority,
      confidence,
      region: (r.emirate && REGION[r.emirate]) || null,
      emirateLabel: r.emirate || 'Unconfirmed',
      location: r.location || null,
      description: r.description || null,
      ownership: r.ownership || null,
      website: r.website || null,
      phone: r.phone || null,
      email: r.email || null,
      address: r.address || null,
      safaRelevance: r.safa_relevance || null,
      sources: splitSources(r.sources),
      relationship,
    };

    // Upsert key: name + stage (a name can appear under two stages in the data).
    const existing = await prisma.directoryEntry.findFirst({
      where: { nameEn: data.nameEn, stage: data.stage },
      select: { id: true },
    });

    if (existing) {
      await prisma.directoryEntry.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.directoryEntry.create({ data });
      created++;
    }
  }

  console.log(`\nDirectory import done. created=${created} updated=${updated} skipped=${skipped} total=${rows.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
