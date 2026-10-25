import { NTR_FACTS, REGION_BASELINE, TIER_LADDER, validateFacts } from '@/facts';

export const dynamic = 'force-dynamic';

const fmt = (n: number) => n.toLocaleString('en-US');
const opt = (n: number | null) => (n === null ? 'not sourced' : fmt(n));

export default function FactsPage() {
  const validation = validateFacts();
  const totals = NTR_FACTS.baseline.nationalTotals;
  const priors = NTR_FACTS.baseline.validationPriors;
  const taxonomy = NTR_FACTS.taxonomy;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">Fact Graph</h1>
        <p className="text-sm text-muted">
          Source of truth for taxonomy, tiers, and the emirate baseline (reported national totals plus indicative allocations, see caveats).
          Validation: {validation.ok ? '✓ consistent' : `✗ ${validation.errors.length} issue(s)`}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-medium">National baseline</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Textile waste (t/yr, reported)" value={`~${fmt(totals.textileWasteTons)}`} />
          <Stat label="Share to landfill (reported)" value={`~${Math.round(totals.landfillShare * 100)}%`} />
          <Stat label="Landfilled (t/yr, derived)" value={`~${fmt(totals.landfilledTons)}`} />
          <Stat label="Textile items consumed / yr (reported)" value={`~${fmt(totals.textileItemsConsumedPerYear / 1_000_000)} M`} />
          <Stat label="Apparel (t/yr, indicative)" value={fmt(totals.apparelTons)} />
          <Stat label="Carpet (t/yr, indicative)" value={fmt(totals.carpetTons)} />
          <Stat label="Hospitality textiles (t/yr, indicative)" value={fmt(totals.hospitalityTextileTons)} />
          <Stat label="Other textile (t/yr, indicative)" value={fmt(totals.otherTextileTons)} />
        </div>
        <p className="mt-2 text-xs text-muted">{NTR_FACTS.baseline.source}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          {NTR_FACTS.baseline.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Validation priors (placeholder)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Carpet kg per m² (typical)" value={`${priors.carpetKgPerM2Typical}`} />
          <Stat label="Hotel linen kg per room-year (typical)" value={`${priors.hotelLinenKgPerRoomYearTypical}`} />
          <Stat label="Apparel kg per capita-year (typical)" value={`${priors.apparelKgPerCapitaYearTypical}`} />
          <Stat label="Contamination reject rate (typical)" value={`${Math.round(priors.contaminationRejectRateTypical * 100)}%`} />
        </div>
        <p className="mt-2 text-xs text-muted">
          General industry ranges used only to sanity-check reported figures. The network&apos;s measured data replaces them.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Taxonomy</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-3">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">Participants</div>
            <ul className="space-y-1 text-sm">
              {taxonomy.partnerTypes.map((p) => (
                <li key={p.code}>
                  <span className="font-mono text-xs text-muted">{p.code}</span> {p.en} · {p.ar}
                  {p.subtypes.length > 0 && (
                    <span className="text-xs text-muted"> ({p.subtypes.join(', ')})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-line bg-white p-3">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">Textile streams</div>
            <ul className="space-y-1 text-sm">
              {taxonomy.wasteStreams.map((w) => (
                <li key={w.code}>
                  <span className="font-mono text-xs text-muted">{w.code}</span> {w.en} · {w.ar}
                </li>
              ))}
            </ul>
            <div className="mb-1 mt-4 text-xs uppercase tracking-wide text-muted">Fates</div>
            <p className="text-sm">
              {taxonomy.wasteFates.map((f) => (
                <span
                  key={f}
                  className={`mb-1 mr-1 inline-block rounded border px-1.5 py-0.5 font-mono text-xs ${
                    (taxonomy.divertedFates as readonly string[]).includes(f)
                      ? 'border-mint-300 bg-mint-100 text-mint-700'
                      : 'border-line bg-mist text-muted'
                  }`}
                >
                  {f}
                </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-muted">Green fates count toward the diversion rate.</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-line bg-white p-3 text-sm text-muted">
          <span className="font-medium text-ink">Grading at intake.</span> {taxonomy.grading}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Tier ladder</h2>
        <div className="space-y-2">
          {TIER_LADDER.map((t) => (
            <div key={t.code} className="rounded-lg border border-line bg-white p-3">
              <div className="font-medium">{t.order}. {t.nameEn} · {t.nameAr}</div>
              <div className="text-sm text-muted">Earned by: {t.earnedBy}</div>
              <div className="text-sm text-muted">Unlocks: {t.unlocks}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Emirate baseline (indicative)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="p-2">Emirate</th>
                <th className="p-2">Quality</th>
                <th className="p-2 text-right">Textile waste (t)</th>
                <th className="p-2 text-right">Landfilled (t)</th>
                <th className="p-2 text-right">Carpet (t)</th>
                <th className="p-2 text-right">Apparel (t)</th>
                <th className="p-2 text-right">Hospitality (t)</th>
                <th className="p-2 text-right">Other (t)</th>
                <th className="p-2 text-right">Hotel rooms</th>
                <th className="p-2 text-right">Recyclers</th>
                <th className="p-2 text-right">Sorters</th>
                <th className="p-2 text-right">Collection points</th>
              </tr>
            </thead>
            <tbody>
              {REGION_BASELINE.map((r) => (
                <tr key={r.code} className="border-t border-line/70">
                  <td className="p-2">{r.nameEn} · {r.nameAr}</td>
                  <td className="p-2 text-xs text-muted">{r.baselineQuality}</td>
                  <td className="p-2 text-right">{fmt(r.textileWasteTons)}</td>
                  <td className="p-2 text-right">{fmt(r.landfilledTons)}</td>
                  <td className="p-2 text-right">{fmt(r.carpetTons)}</td>
                  <td className="p-2 text-right">{fmt(r.apparelTons)}</td>
                  <td className="p-2 text-right">{fmt(r.hospitalityTextileTons)}</td>
                  <td className="p-2 text-right">{fmt(r.otherTextileTons)}</td>
                  <td className="p-2 text-right text-muted">{opt(r.hotelRooms)}</td>
                  <td className="p-2 text-right text-muted">{opt(r.recyclers)}</td>
                  <td className="p-2 text-right text-muted">{opt(r.sorters)}</td>
                  <td className="p-2 text-right text-muted">{opt(r.collectionPoints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Per-emirate rows are indicative allocations of the national figure. Never quote them externally as measured.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">ESG</h2>
        <div className="rounded-lg border border-line bg-white p-3 text-sm">
          <div>
            Indicative factor: <span className="font-semibold">{NTR_FACTS.esg.indicativeFactorTCO2ePerTon} tCO₂e</span> per productively diverted tonne (placeholder).
          </div>
          <p className="mt-1 text-xs text-muted">{NTR_FACTS.esg.factorCaveat}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Engagement calendar</h2>
        <div className="space-y-1 text-sm">
          {NTR_FACTS.engagement.seasonalCalendar.map((s) => (
            <div key={s.period} className="rounded border border-line bg-white p-2">
              <span className="font-medium">{s.period}</span> <span className="text-muted">{s.focus}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Hard rules</h2>
        <div className="space-y-1 text-sm">
          {NTR_FACTS.hardRules.map((r) => (
            <div key={r.id} className="rounded border border-line bg-white p-2">
              <span className="font-mono text-xs text-muted">[{r.id} · {r.severity}]</span> {r.rule}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
