/**
 * NTR constants shim.
 *
 * Historical filename kept so the inherited runtime's imports keep working
 * (chat route, agent-run, responders). The real source of truth is the
 * NTR fact graph in `@/facts`.
 *
 * TODO(rename): move importers to `@/lib/ntr-constants` once the runtime
 * stabilizes, then delete this file.
 */

import { NTR_FACTS, buildCachedFactsPrefix } from '@/facts';

export const PLATFORM = {
  nameEn: NTR_FACTS.identity.platformNameEn,
  nameAr: NTR_FACTS.identity.platformNameAr,
  authority: NTR_FACTS.identity.authority,
  brand: NTR_FACTS.brand,
} as const;

export const HARD_RULES_MD = NTR_FACTS.hardRules
  .map((r) => `[${r.id} · ${r.severity}] ${r.rule}`)
  .join('\n');

/** Cached prefix — network hard rules + taxonomy + baseline, prepended to every agent prompt. */
export function buildCachedPrefix(): string {
  return buildCachedFactsPrefix();
}
