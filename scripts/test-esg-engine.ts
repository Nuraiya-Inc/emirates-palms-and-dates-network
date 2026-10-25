/**
 * Unit tests for the M6 climate engine — pure-math coverage, no DB needed.
 *
 * Covers (pack acceptance):
 *   1. Fate math — diverted (REUSED / DONATED / RECYCLED_POLYMER /
 *      RECYCLED_FIBER / DOWNCYCLED / EXPORTED) counted; harmful
 *      (INCINERATED / LANDFILLED) surfaced as opportunity; UNKNOWN neither.
 *   2. Indicative flag — every estimate carries indicative: true.
 *   3. Factor — the placeholder is 1.5 tCO2e per productively diverted tonne.
 *   4. Aggregation floor — MIN_AGGREGATE is 3 (≥3-partner rule, NTR-3).
 *
 * Run: npx tsx scripts/test-esg-engine.ts
 */
import assert from 'node:assert/strict';
import {
  summarize,
  climateNarrative,
  INDICATIVE_FACTOR_TCO2E_PER_TON,
  DIVERTED_FATES,
  HARMFUL_FATES,
} from '../src/lib/esg';
import { MIN_AGGREGATE } from '../src/lib/sector-report';

console.log('🧪 M6 climate-engine tests');

// ── Factor ────────────────────────────────────────────────────────
assert.equal(INDICATIVE_FACTOR_TCO2E_PER_TON, 1.5, 'placeholder factor is 1.5 tCO2e per diverted tonne');

// ── Fate math ─────────────────────────────────────────────────────
const est = summarize(2025, [
  { stream: 'APPAREL_WEARABLE', fate: 'REUSED', tons: 4 },
  { stream: 'APPAREL_WEARABLE', fate: 'DONATED', tons: 6 },
  { stream: 'PC_CARPET_TILE', fate: 'RECYCLED_POLYMER', tons: 12 },
  { stream: 'HOSPITALITY_TEXTILE', fate: 'RECYCLED_FIBER', tons: 5 },
  { stream: 'TECHNICAL_TEXTILE', fate: 'DOWNCYCLED', tons: 2 },
  { stream: 'APPAREL_NONWEARABLE', fate: 'EXPORTED', tons: 3 },
  { stream: 'PC_CARPET_BROADLOOM', fate: 'LANDFILLED', tons: 9 },
  { stream: 'TURF', fate: 'INCINERATED', tons: 3 },
  { stream: 'OTHER', fate: 'UNKNOWN', tons: 6 },
]);

assert.equal(est.divertedTons, 32, 'diverted = REUSED+DONATED+RECYCLED_POLYMER+RECYCLED_FIBER+DOWNCYCLED+EXPORTED');
assert.equal(est.harmfulTons, 12, 'harmful = LANDFILLED+INCINERATED');
assert.equal(est.totalWasteTons, 50, 'total includes UNKNOWN');
assert.equal(est.estAvoidedTCO2e, Math.round(32 * INDICATIVE_FACTOR_TCO2E_PER_TON * 10) / 10, 'avoided = diverted × factor');
assert.equal(est.opportunityTCO2e, Math.round(12 * INDICATIVE_FACTOR_TCO2E_PER_TON * 10) / 10, 'opportunity = harmful × factor');
assert.equal(est.diversionRatePct, Math.round((32 / 50) * 100), 'diversion rate over all recorded tons');
assert.equal(est.indicative, true, 'estimate carries indicative flag');
assert.equal(est.byStream.length, 5, 'byStream groups diverted streams only');

// Diverted and harmful sets are disjoint and match the WasteFate enum.
for (const f of DIVERTED_FATES) assert.ok(!(HARMFUL_FATES as readonly string[]).includes(f));
assert.deepEqual(
  [...DIVERTED_FATES].sort(),
  ['DONATED', 'DOWNCYCLED', 'EXPORTED', 'RECYCLED_FIBER', 'RECYCLED_POLYMER', 'REUSED'],
);
assert.deepEqual([...HARMFUL_FATES].sort(), ['INCINERATED', 'LANDFILLED']);

// ── Narrative helper ──────────────────────────────────────────────
const n = climateNarrative(est);
assert.equal(n.avoidedTCO2e, est.estAvoidedTCO2e);
assert.equal(n.opportunityTCO2e, est.opportunityTCO2e);
assert.equal(n.indicative, true);
assert.match(n.headlineEn, /indicative/i, 'EN headline says indicative');
assert.match(n.detailEn, /landfill/i, 'detail frames landfill avoidance');
assert.ok(n.headlineAr.length > 0, 'AR headline present');

// ── Edge cases ────────────────────────────────────────────────────
const empty = summarize(2025, []);
assert.equal(empty.divertedTons, 0);
assert.equal(empty.diversionRatePct, null, 'no division by zero');
assert.equal(empty.opportunityTCO2e, 0);
assert.equal(empty.indicative, true);

const allLandfilled = summarize(2025, [{ stream: 'PC_CARPET_BROADLOOM', fate: 'LANDFILLED', tons: 10 }]);
assert.equal(allLandfilled.divertedTons, 0);
assert.equal(allLandfilled.harmfulTons, 10);
assert.equal(allLandfilled.estAvoidedTCO2e, 0, 'landfilled tons earn nothing');
assert.equal(allLandfilled.opportunityTCO2e, 15, 'all 10 tons are the opportunity (10 × 1.5)');

// ── ≥3 aggregation floor (NTR-3) ──────────────────────────────────
assert.equal(MIN_AGGREGATE, 3, 'aggregation floor is 3 partners');
// The floor is enforced where aggregates are built (sector-report /
// impact-map null out sub-3 emirates) — verified live in parity-check.

console.log('   ✔ factor = 1.5 tCO2e per diverted tonne (placeholder)');
console.log('   ✔ fate math: diverted / harmful / opportunity');
console.log('   ✔ indicative flag on every output');
console.log('   ✔ narrative frames landfill avoidance');
console.log('   ✔ MIN_AGGREGATE = 3 (NTR-3 floor)');
console.log('✅ All M6 engine tests pass');
