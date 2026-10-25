/**
 * Staff Guide — onboarding + operating reference for the network console.
 * Written for a first-time network official: what each screen is for, the
 * daily rhythm, the iron rules, and exactly how to use Noura as staff.
 */

import Link from 'next/link';

export const dynamic = 'force-dynamic';

function Chapter({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`ch-${no}`} className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="section-rule" aria-hidden />
      <h2 className="text-lg font-semibold tracking-tight text-brand-800">
        <span className="mr-2 font-mono text-sm text-gold-600">{no}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
      {children}
    </div>
  );
}

const CHAPTERS: Array<[string, string]> = [
  ['01', 'The console at a glance'], ['02', 'Your daily rhythm'], ['03', 'The approval rule'],
  ['04', 'Partner registry & certificates'], ['05', 'Noura for staff'], ['06', 'Bulk onboarding'],
  ['07', 'Emirate standings'], ['08', 'ESG figures — what you may say'], ['09', 'The agent team'],
  ['10', 'Data governance'],
];

export default function StaffGuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="relative overflow-hidden rounded-2xl p-7 text-white shadow-card-hover"
           style={{ background: 'linear-gradient(135deg, #0B101D, #141C30 60%, #1F2A44)' }}>
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">Staff Guide · دليل الموظف</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Operating the network console</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            How the platform works, what your role in it is, and how to get the most out of the
            agent team. Ten chapters — the first three are the essentials.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {CHAPTERS.map(([n, t]) => (
              <a key={n} href={`#ch-${n}`} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white/90 transition hover:bg-white/20">
                {n} · {t}
              </a>
            ))}
          </div>
        </div>
      </div>

      <Chapter no="01" title="The console at a glance">
        <p>
          <Link href="/dashboard" className="text-brand-600 underline underline-offset-2">Dashboard</Link> is
          the UAE textile stream in one screen: the national waste figure, verified diversion, emirate
          bars, and the live activity feed. Every number is one of two kinds — <b>measured</b>
          {' '}(from approved partner diversion reports) or <b>baseline</b> (reported national totals and indicative emirate allocations) —
          and the interface always labels which is which. When someone asks &quot;where does this
          figure come from?&quot;, the answer is always traceable: report → validation → approval.
        </p>
        <p>
          The left sidebar is organized by frequency: <b>Command</b> (what needs you today),
          {' '}<b>Network</b> (partners and their activity), <b>Team</b> (the agents and staff).
        </p>
      </Chapter>

      <Chapter no="02" title="Your daily rhythm — three stops">
        <p>
          <b>1 · <Link href="/needs-you" className="text-brand-600 underline underline-offset-2">Needs you</Link></b> —
          everything waiting on a human decision, sorted by urgency. Start here.
        </p>
        <p>
          <b>2 · <Link href="/approvals" className="text-brand-600 underline underline-offset-2">Approvals</Link></b> —
          tier changes, registry changes, and anything agents have drafted for official sign-off.
          Approve, return with a note, or reject; every decision is recorded in the audit log.
        </p>
        <p>
          <b>3 · <Link href="/network" className="text-brand-600 underline underline-offset-2">Network inbox</Link></b> —
          partner applications (awards, grants), suggestions and complaints from Voice of the
          Network, and open pickup requests and listings. Decide applications here; partners see
          your decision in their portal immediately.
        </p>
      </Chapter>

      <Chapter no="03" title="The approval rule — agents draft, officials approve">
        <Rule>
          No tier change, no registry change, no certification language, and no public communication
          goes out without a network official&apos;s explicit approval. Agents prepare; you decide.
          This is enforced in code, not just policy.
        </Rule>
        <p>
          Practically: when the certification agent believes a partner earned a promotion, an
          approval request appears in your queue with the evidence attached (approved quarters,
          validation scores, chain-of-custody checks). Until you approve, nothing changes for the partner and Noura tells
          them only that the request is &quot;with the network team for approval.&quot;
        </p>
      </Chapter>

      <Chapter no="04" title="Partner registry & certificates">
        <p>
          <Link href="/partners" className="text-brand-600 underline underline-offset-2">Partners</Link> is
          the national registry: every member, tier, standing, and last report at a glance. Each row
          has a <b>PDF ↓</b> link that generates the partner&apos;s official bilingual certificate
          on demand — current tier, registry number, and a QR code.
        </p>
        <p>
          The QR resolves to a <b>public verification page</b> (<code>/verify/…</code>) that shows
          standing only — never figures. Anyone can scan it: buyers, banks, inspectors. This is
          the network acting as the stream&apos;s verification layer, and it costs you nothing to
          issue.
        </p>
      </Chapter>

      <Chapter no="05" title="Noura for staff — your operator">
        <p>
          Staff accounts get a more capable Noura in <Link href="/agents" className="text-brand-600 underline underline-offset-2">Agents</Link>.
          Things you can ask her to do, in plain language:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>&quot;List all Dubai hotels that haven&apos;t reported this quarter&quot;</li>
          <li>&quot;Show me the detail of a partner&apos;s Q2 diversion report&quot;, then &quot;approve it&quot;</li>
          <li>&quot;What&apos;s the emirate benchmark for medium hotel groups in Abu Dhabi?&quot;</li>
          <li>&quot;Draft a tier promotion for NTR-AUH-00005&quot; (arrives in your approval queue)</li>
          <li>&quot;Register these partners…&quot; — see bulk onboarding below</li>
          <li>&quot;Generate a quarterly summary document for the leadership meeting&quot;</li>
        </ul>
        <p className="text-sm text-muted">
          Everything Noura does is written to the audit log under your session, the same
          accountability as doing it by hand, at a fraction of the time.
        </p>
      </Chapter>

      <Chapter no="06" title="Bulk onboarding — a portfolio register in one conversation">
        <p>To onboard many partners at once, give Noura the list. Any format works:</p>
        <div className="rounded-xl bg-mist p-4 font-mono text-[13px] leading-relaxed">
          You: <i>Here is the hotel group&apos;s property list (attach the spreadsheet, paste a table,
          or even a photo of a printed list). Please onboard all of them.</i>
        </div>
        <p>
          Noura normalizes every row (emirates mapped, participant types matched), <b>shows you a
          preview</b>, flags duplicates already in the registry, and asks for your go-ahead. On
          confirmation she registers the batch, up to 100 at a time, with sequential registry
          numbers per emirate (<code>NTR-AUH-00007, 00008, …</code>), all starting at Registered
          tier. The batch is recorded in the audit log and the activity feed.
        </p>
        <Rule>Noura never invents rows. She registers only what you actually supplied, and she skips duplicates rather than overwriting.</Rule>
      </Chapter>

      <Chapter no="07" title="Emirate standings — recognition, never penalty">
        <p>
          <Link href="/standings" className="text-brand-600 underline underline-offset-2">Standings</Link> ranks
          emirates for the current reporting cycle: <b>participation first</b>, diversion rate
          second, volume third (dampened so large emirates don&apos;t win on size alone). Use it in
          emirate lead meetings. The question &quot;where does my emirate stand?&quot; moves
          behavior more than any circular. Frame it as recognition: ask Noura to draft
          congratulation letters for the podium; never use standings to penalize.
        </p>
      </Chapter>

      <Chapter no="08" title="ESG figures — what you may and may not say">
        <Rule>
          Every CO₂e figure on the platform is an <b>indicative estimate</b> from verified
          diversion. It is labeled that way everywhere, and must stay that way in anything you
          publish. It is NOT verified carbon accounting and NOT tradeable credits.
        </Rule>
        <p>
          Safe language: <i>&quot;estimated avoided emissions from verified textile
          diversion.&quot;</i> Not safe: &quot;carbon credits,&quot; &quot;offsets,&quot; or any
          tradeable claim. Before any external ESG publication, the network should engage a
          qualified carbon methodology consultant. The platform&apos;s honest labeling is an asset
          — it is what makes the data credible as the UAE&apos;s carbon-market infrastructure matures.
        </p>
      </Chapter>

      <Chapter no="09" title="The agent team — who does what">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Noura (nou-00)', 'Partner concierge & orchestrator — the only agent partners ever see'],
                ['Intake (int-01)', 'Parses messy files: Excel in any layout, weighbridge slips, load photos, voice notes'],
                ['Validation (val-01)', 'Checks every figure against history, emirate priors, physical bounds (kg per m², kg per room-year)'],
                ['Analytics (ana-01)', 'Benchmarks, trends, and briefing material'],
                ['Certification (cer-01)', 'Drafts tier and standing changes for your approval'],
                ['Engagement (eng-01)', 'Reminder campaigns and seasonal communications'],
                ['Registry (reg-01)', 'Keeps the record of truth: registry numbers, profiles, history'],
              ].map(([a, d]) => (
                <tr key={a} className="border-t border-line/70">
                  <td className="p-2 font-mono text-xs text-brand-800">{a}</td>
                  <td className="p-2">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">
          Backend agents never talk to partners. Their work reaches partners only through
          Noura&apos;s voice, and reaches the registry only through your approvals.
        </p>
      </Chapter>

      <Chapter no="10" title="Data governance — the hard rules">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Partner confidentiality:</b> one partner&apos;s data is never shown to another. Aggregates require at least three partners; below that the platform shows the emirate baseline, labeled as such.</li>
          <li><b>Auditability:</b> every agent action, tool call, and official decision is written to the <Link href="/activity" className="text-brand-600 underline underline-offset-2">audit log</Link>.</li>
          <li><b>Baseline honesty:</b> only the national totals are reported (approximate, June 2026); every emirate row and stream split is an indicative placeholder. Never quote them externally. Reported data replaces them.</li>
          <li><b>Every load gets a fate:</b> landfill with its reason is still a logged fate. A load never disappears from the ledger to flatter a diversion rate.</li>
          <li><b>No affiliation claims:</b> the platform is independent. It never claims government endorsement or affiliation with the national textile-circularity initiative.</li>
          <li><b>Arabic first:</b> all partner-facing communication defaults to Arabic; partners who prefer English get English. The choice is remembered.</li>
        </ul>
      </Chapter>

      <p className="pb-4 text-center text-xs text-muted">
        Partners have their own guide at <code>/portal/guide</code> — it opens automatically on
        their first visit. When a partner asks &quot;how do I…&quot;, Noura answers; this page
        is for you.
      </p>
    </div>
  );
}
