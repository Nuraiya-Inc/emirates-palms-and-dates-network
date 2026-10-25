/**
 * src/lib/arabic — the Arabic-native layer for Noura.
 *
 *   lexicon.ts   textile-trade vocabulary → canonical streams/fates/material types
 *   units.ts     local units (بالة، كيس، لفة، متر مربع…) → kg low–high ranges
 *   calendar.ts  seasonal/Hijri anchors → reporting quarter
 *   resolve.ts   the deterministic resolver — runs before any record tool
 *   stt.ts       Whisper priming built from the same lexicon
 *
 * Standing-rule alignment:
 *   - Authority lives in the tool layer: resolve_quantity +
 *     record_waste/record_production enforce this in code, not prompt.
 *   - Indicative honesty: local-unit ranges and area-to-weight inferences
 *     are marked INDICATIVE and never rendered as measured.
 *   - No invented figures: unresolved quantities return a clarifying
 *     question in dialect instead of a guess.
 */

export * from './lexicon';
export * from './units';
export * from './calendar';
export * from './resolve';
export * from './stt';
