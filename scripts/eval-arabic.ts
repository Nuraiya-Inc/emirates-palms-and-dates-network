/**
 * Arabic-native eval — "proof it works" for the Arabic layer.
 *
 *   npx tsx scripts/eval-arabic.ts              deterministic arm only (no keys needed)
 *   npx tsx scripts/eval-arabic.ts --with-model adds the plain-model baseline arm (ANTHROPIC_API_KEY)
 *
 * Arm A (always): the deterministic resolver (src/lib/arabic) on a corpus
 * of Gulf-dialect utterances from housekeeping managers, fit-out foremen,
 * store managers and recycler intake clerks — stream classification,
 * tonnage bounds, period resolution, clarify-vs-guess verdict. Scored
 * against ground truth below.
 *
 * Arm B (--with-model): the SAME utterances fed to the plain model with
 * today's pre-build instruction ("speak MSA, mirror the user, extract
 * figures") — showing the silent-guess failure modes the pipeline
 * removes. Prints a side-by-side scorecard.
 *
 * Extend the corpus as real voice notes arrive — the file is data-first.
 *
 * Textile units the resolver must know: bale (بالة, pressed 300–500 kg or a
 * loose sack ~100 kg), roll of carpet (لفة / رول), square metres of carpet
 * (متر مربع, ~4.5 kg/m2 placeholder prior), bag of linen or clothes
 * (كيس / شوال), pallet (طبلية), truck load (حمولة).
 */

import { resolveQuantity, playbackLine } from '../src/lib/arabic';
import { normalizeDigits } from '../src/lib/arabic/resolve';

// ── Corpus ─────────────────────────────────────────────────────
// expectedKgLo/Hi define the ACCEPTABLE band for kgMid: pass if
// kgMid falls inside. null expectations mean the field must be null.
// `mustClarify` expected true = resolver must refuse to record.

interface Case {
  id: string;
  utterance: string;
  kind: 'WASTE' | 'PRODUCTION';
  expected: {
    stream?: string | null;
    fate?: string | null;
    materialType?: string | null;
    kgLo?: number | null;   // kgMid must be ≥ kgLo
    kgHi?: number | null;   // kgMid must be ≤ kgHi
    quarter?: number | null;
    mustClarify?: boolean;
  };
  note?: string;
}

const CORPUS: Case[] = [
  {
    id: 'bales-linen-ramadan',
    utterance: 'عندنا عشر بالات ملايات قديمة من التجديد، تبرعنا فيها في رمضان',
    kind: 'WASTE',
    expected: { stream: 'HOSPITALITY_TEXTILE', fate: 'DONATED', mustClarify: true },
    note: 'بالة = ambiguous unit (loose sack vs pressed bale) → must ask, not guess. رمضان → Hijri month → quarter.',
  },
  {
    id: 'bale-weight-stated',
    utterance: 'بالة مكبوسة ٤٠٠ كيلو ملابس صدّرناها',
    kind: 'WASTE',
    expected: { fate: 'EXPORTED', kgLo: 380, kgHi: 420, mustClarify: false },
    note: 'Weight stated (400 kg) so the bale ambiguity is resolved; record with the approx band.',
  },
  {
    id: 'carpet-rolls-corridors',
    utterance: '٢٠ رول سجاد من الممرات، نقلناه لمعيد التدوير',
    kind: 'WASTE',
    expected: { stream: 'PC_CARPET_BROADLOOM', mustClarify: true },
    note: 'Roll length and width unknown → ask. Fate is "recycled" but the route (polymer vs fibre) is not stated.',
  },
  {
    id: 'carpet-tile-sqm-nylon',
    utterance: 'شلنا ١٥٠٠ متر مربع بلاط سجاد نايلون، راح للتدوير البوليمري',
    kind: 'WASTE',
    expected: { stream: 'PC_CARPET_TILE', fate: 'RECYCLED_POLYMER', materialType: 'nylon', kgLo: 6000, kgHi: 7500, mustClarify: false },
    note: '1,500 m2 × ~4.5 kg/m2 placeholder prior → ~6,750 kg, INDICATIVE. Material type captured.',
  },
  {
    id: 'incinerated-no-qty',
    utterance: 'حرقنا بقايا القماش القديمة',
    kind: 'WASTE',
    expected: { fate: 'INCINERATED', mustClarify: true },
    note: 'Past burning acknowledged; no quantity → ask.',
  },
  {
    id: 'uniforms-september-donated',
    utterance: 'في سبتمبر جمعنا ٣ طن زي مدرسي وتبرعنا فيه',
    kind: 'WASTE',
    expected: { stream: 'APPAREL_WEARABLE', fate: 'DONATED', kgLo: 2800, kgHi: 3200, quarter: 3, mustClarify: false },
    note: 'Explicit month → Q3. Explicit tons → no clarification needed.',
  },
  {
    id: 'bare-number',
    utterance: 'عندي 15 سجاد',
    kind: 'WASTE',
    expected: { mustClarify: true },
    note: '15 what? rolls, m2, tons → must ask.',
  },
  {
    id: 'towels-landfilled-ton-half',
    utterance: 'الفوط كلها راحت المكب، شي طن ونص',
    kind: 'WASTE',
    expected: { stream: 'HOSPITALITY_TEXTILE', fate: 'LANDFILLED', kgLo: 1400, kgHi: 1600, mustClarify: false },
    note: 'ونص → ×1.5. Landfill logged with its own fate, never dropped (NTR-8).',
  },
  {
    id: 'sacks-nonwearable',
    utterance: 'خمس شوالات ملابس ما تنلبس رحنا فيها للمصنع',
    kind: 'WASTE',
    expected: { stream: 'APPAREL_NONWEARABLE', mustClarify: true },
    note: 'شوال HIGH ambiguity → ask.',
  },
  {
    id: 'curtains-pallets',
    utterance: 'ستاير ومفارش بعد التجديد، أربع طبليات',
    kind: 'WASTE',
    expected: { stream: 'HOSPITALITY_TEXTILE', mustClarify: true },
    note: 'Pallet of soft goods is a volume, not a weight → ask.',
  },
  {
    id: 'recycler-intake-tons',
    utterance: 'استلمنا هالربع ٤٠ طن سجاد مستعمل في المصنع',
    kind: 'PRODUCTION',
    expected: { kgLo: 38000, kgHi: 42000 },
    note: 'Recycler intake: 40 t received this quarter. Explicit tons.',
  },
  {
    id: 'turf-landfilled',
    utterance: 'عشب صناعي من الملعب، حوالي ٨ طن، رحنا فيه للمكب',
    kind: 'WASTE',
    expected: { stream: 'TURF', fate: 'LANDFILLED', kgLo: 7000, kgHi: 9000, mustClarify: false },
    note: 'حوالي → approximate band around 8 t; still recordable.',
  },
];

// ── Scoring ────────────────────────────────────────────────────

interface ArmResult {
  id: string;
  pass: boolean;
  detail: string;
}

/** Material type field across resolver versions (materialType, formerly variety). */
function materialOf(r: unknown): string | null {
  const o = r as { materialType?: string | null; variety?: string | null };
  return o.materialType ?? o.variety ?? null;
}

function scoreResolver(): ArmResult[] {
  return CORPUS.map((c) => {
    const r = resolveQuantity(normalizeDigits(c.utterance), c.kind);
    const fails: string[] = [];
    const e = c.expected;

    if (e.stream !== undefined && r.stream !== e.stream)
      fails.push(`stream: got ${r.stream}, want ${e.stream}`);
    if (e.fate !== undefined && r.fate !== e.fate)
      fails.push(`fate: got ${r.fate}, want ${e.fate}`);
    if (e.materialType !== undefined && materialOf(r) !== e.materialType)
      fails.push(`materialType: got ${materialOf(r)}, want ${e.materialType}`);
    if (e.quarter !== undefined && r.period?.quarter !== e.quarter)
      fails.push(`quarter: got ${r.period?.quarter ?? '∅'}, want ${e.quarter}`);
    if (e.kgLo != null && (r.kgMid === null || r.kgMid < e.kgLo))
      fails.push(`kgMid ${r.kgMid} < ${e.kgLo}`);
    if (e.kgHi != null && (r.kgMid === null || r.kgMid > e.kgHi))
      fails.push(`kgMid ${r.kgMid} > ${e.kgHi}`);
    if (e.mustClarify !== undefined && r.mustClarify !== e.mustClarify)
      fails.push(`mustClarify: got ${r.mustClarify}, want ${e.mustClarify}`);

    return {
      id: c.id,
      pass: fails.length === 0,
      detail: fails.length
        ? `FAIL — ${fails.join('; ')}`
        : `OK — ${playbackLine(r)}${r.mustClarify ? ` | asks: ${r.clarifyQuestion}` : ''}`,
    };
  });
}

// ── Optional: plain-model baseline arm ─────────────────────────

async function scorePlainModel(): Promise<ArmResult[]> {
  const { getAnthropicClient } = await import('../src/lib/anthropic');
  const client = getAnthropicClient();
  const out: ArmResult[] = [];

  for (const c of CORPUS) {
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 300,
      temperature: 0,
      system:
        'You are a bilingual textile-recovery reporting assistant. The partner writes in Gulf Arabic. ' +
        'Extract the reported quantity and categorize it. Reply ONLY with compact JSON: ' +
        '{"stream": "PI_CARPET|PC_CARPET_TILE|PC_CARPET_BROADLOOM|APPAREL_WEARABLE|APPAREL_NONWEARABLE|HOSPITALITY_TEXTILE|TECHNICAL_TEXTILE|TURF|OTHER|null", ' +
        '"fate": "REUSED|DONATED|RECYCLED_POLYMER|RECYCLED_FIBER|DOWNCYCLED|EXPORTED|INCINERATED|LANDFILLED|UNKNOWN|null", ' +
        '"material_type": "canonical-en|null", "tons": number|null, "quarter": 1|2|3|4|null, "would_ask_clarification": boolean}. No prose.',
      messages: [{ role: 'user', content: c.utterance }],
    });
    const text = resp.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      out.push({ id: c.id, pass: false, detail: `FAIL — non-JSON reply: ${text.slice(0, 80)}` });
      continue;
    }
    if (!parsed) {
      out.push({ id: c.id, pass: false, detail: 'FAIL — empty parse' });
      continue;
    }
    const e = c.expected;
    const fails: string[] = [];
    if (e.stream !== undefined && parsed.stream !== e.stream)
      fails.push(`stream: got ${parsed.stream}, want ${e.stream}`);
    if (e.fate !== undefined && parsed.fate !== e.fate)
      fails.push(`fate: got ${parsed.fate}, want ${e.fate}`);
    if (e.kgLo != null) {
      const kg = typeof parsed.tons === 'number' ? parsed.tons * 1000 : null;
      if (kg === null || kg < e.kgLo) fails.push(`tons→kg ${kg} < ${e.kgLo}`);
    }
    if (e.kgHi != null) {
      const kg = typeof parsed.tons === 'number' ? parsed.tons * 1000 : null;
      if (kg === null || kg > e.kgHi) fails.push(`tons→kg ${kg} > ${e.kgHi}`);
    }
    if (e.mustClarify === true && parsed.would_ask_clarification !== true)
      fails.push('model recorded instead of asking');
    out.push({
      id: c.id,
      pass: fails.length === 0,
      detail: fails.length ? `FAIL — ${fails.join('; ')}` : `OK — ${JSON.stringify(parsed)}`,
    });
  }
  return out;
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(70));
  console.log('ARM A — deterministic Arabic resolver (src/lib/arabic)');
  console.log('═'.repeat(70));
  const a = scoreResolver();
  for (const r of a) console.log(`${r.pass ? '✅' : '❌'} ${r.id.padEnd(30)} ${r.detail}`);
  const aPass = a.filter((r) => r.pass).length;
  console.log(`\nResolver: ${aPass}/${a.length} passed (${Math.round((aPass / a.length) * 100)}%)`);

  if (process.argv.includes('--with-model')) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('\n--with-model requires ANTHROPIC_API_KEY; skipping Arm B.');
      return;
    }
    console.log('\n' + '═'.repeat(70));
    console.log('ARM B — plain model, no resolver (baseline for comparison)');
    console.log('═'.repeat(70));
    const b = await scorePlainModel();
    for (const r of b) console.log(`${r.pass ? '✅' : '❌'} ${r.id.padEnd(30)} ${r.detail}`);
    const bPass = b.filter((r) => r.pass).length;
    console.log(`\nPlain model: ${bPass}/${b.length} passed (${Math.round((bPass / b.length) * 100)}%)`);
    console.log(`\nDelta: ${aPass - bPass >= 0 ? '+' : ''}${aPass - bPass} cases — the pipeline advantage.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
