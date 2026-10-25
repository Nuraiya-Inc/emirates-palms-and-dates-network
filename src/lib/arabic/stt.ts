/**
 * Speech-to-text priming — builds Whisper's `prompt` hint from the SAME
 * lexicon the resolver uses, so ASR and resolution can never drift apart.
 *
 * A Latin-script hint nudges Whisper toward transliterating dialect
 * speech into Latin — exactly what we DON'T want for an Arabic-native
 * pipeline. An Arabic-script hint preserves dialect spellings the
 * resolver's variant tables are built to catch (موكيت, بالة, شوال, لفة).
 *
 * Whisper's prompt param is soft-capped (~224 tokens); keep the hint
 * compact: canonical dialect forms + a sentence establishing the domain
 * register, not every variant.
 */

import { STREAM_TERMS, MATERIAL_TYPE_TERMS, FATE_TERMS } from './lexicon';
import { LOCAL_UNITS } from './units';

/** Compose the Whisper `prompt` hint — Arabic-script, domain-primed. */
export function buildSttPrompt(): string {
  const streams = STREAM_TERMS.map((t) => t.variants[0] ?? t.canonicalAr).join('، ');
  const units = LOCAL_UNITS.map((u) => u.canonicalAr).join('، ');
  const materials = MATERIAL_TYPE_TERMS.map((v) => v.canonicalAr).join('، ');
  const fates = FATE_TERMS.map((f) => f.canonicalAr).join('، ');
  const seasons = ['القيظ', 'رمضان', 'الشتاء', 'موسم التجديد', 'موسم الفعاليات', 'بداية المدارس'].join('، ');

  return [
    'تقرير ربع سنوي عن حمولات المنسوجات والسجاد في الإمارات، باللهجة الإماراتية.',
    `الأنواع: ${streams}.`,
    `الوحدات: ${units}.`,
    `الخامات: ${materials}.`,
    `الوجهة: ${fates}.`,
    `المواسم: ${seasons}.`,
    'الأرقام قد تكون بالعربية أو اللاتينية.',
  ].join(' ');
}
