# Naseej Textile Recovery Platform

Multi-agent partner platform for **textile recovery in the UAE**. One register
every participant enrols in once, one ledger every load is logged in: carpet,
apparel, hospitality and technical textiles, from removal to final fate.
Operating partner Nuraiya · anchor processor for carpet and polyolefin fractions
Chemplax (Kenton, Tennessee; UAE entry in progress).

**Operating principle:** visibility → routing → diversion → evidence →
incentives → more visibility. Nobody subsidizes a stream they cannot see.
Track and trace first, collect second, valorize third.

The platform is built on the same kernel as the Emirates Palm & Dates Network
(EPDN) and the Dulsco deployment: approval queue, audit log, cron locks,
document pipeline, bilingual partner portal. Domain, facts, agents and seeds are
textile-specific.

> Naming note: Naseej is also the name of the UAE's National Initiative for
> Textile Circularity. This platform is independent infrastructure aligned with
> national goals and must never claim affiliation or endorsement (rule NTR-4).

## Agent roster (v0 — 7 agents)

```
NOU-00  Noura — Agentic Director  ← the only agent partners ever meet
├─ INT-01  Intake & Polishing   (Excel/weighbridge tickets/photos/voice → load records)
├─ VAL-01  Validation           (plausibility vs priors + history; confidence scores)
├─ ANA-01  Analytics            (coverage map, benchmarks — min 3 partners per aggregate)
├─ CER-01  Certification & Tiers (standing engine; drafts only — officials approve)
├─ ENG-01  Engagement           (honor-based campaigns, emirate standings, reminders)
└─ REG-01  Registry             (network registry; public changes via approval queue)
```

## The flow

1. A participant talks to Noura (web chat now, WhatsApp later) and hands over
   whatever they have: a pickup request, a weighbridge ticket, a photo of a
   strip-out, a voice note.
2. Noura extracts, confirms (never interrogates), records loads against the
   schema (stream × fate × tonnes, grade, destination) and submits the
   quarterly diversion report.
3. VAL-01 scores it against regional priors, the partner's own history, and
   physical plausibility. Clean → VALIDATED; questions → RETURNED (kindly).
4. Network staff approve VALIDATED reports; approved data feeds the live
   national dashboard (measured vs indicative coverage per emirate).
5. CER-01 recomputes tier eligibility; tier changes land in the approvals queue:
   **agents draft, officials decide** (hard rule NTR-2).

## Domain model

Partner (registry no, participant type, emirate, tier, standing, profile memory) ·
QuarterlyReport (DRAFT→SUBMITTED→VALIDATED→APPROVED / RETURNED) ·
ProductionRecord (units, tonnes generated / recovered, material types, capacity) ·
WasteRecord (stream × fate × tonnes, destination for chain of custody) ·
MaterialTransfer (source-outbound ↔ offtaker-inbound reconciliation) ·
CollectionTicket (pickup request for a load) · Listing (offtake marketplace) ·
TierEvent · RegionBaseline (indicative allocations; seeded as validation priors).

Streams: PI_CARPET · PC_CARPET_TILE · PC_CARPET_BROADLOOM · APPAREL_WEARABLE ·
APPAREL_NONWEARABLE · HOSPITALITY_TEXTILE · TECHNICAL_TEXTILE · TURF · OTHER.
Fates: REUSED · DONATED · RECYCLED_POLYMER · RECYCLED_FIBER · DOWNCYCLED ·
EXPORTED · INCINERATED · LANDFILLED · UNKNOWN. Every load gets a fate, including
landfill with its reason (rule NTR-8).

## Stack

Next.js 15 App Router + TypeScript · Prisma 5.22 + Postgres · NextAuth v5 ·
Anthropic SDK (per-agent system prompts, bounded tool catalog, prompt-cached
fact-graph prefix) · exceljs/mammoth/sharp/Whisper intake · pdfkit/docx
generators · Docker/Coolify deploy.

## Run locally

```bash
npm install
cp .env.example .env   # set DATABASE_URL, AUTH secrets, ANTHROPIC_API_KEY, SEED_CEO_PASSWORD
docker compose up -d db
npx prisma db push
npm run db:seed
npm run dev            # → http://localhost:3000
```

Seeded logins (rotate immediately):
- Admin: SEED_CEO_EMAIL / SEED_CEO_PASSWORD
- Network demo official: demo.official@naseej.nuraiya.ai / <SEED_CEO_PASSWORD>-ntr
- Demo partner (Dubai hotel group): demo.hotel@partners.naseej.nuraiya.ai / <SEED_CEO_PASSWORD>-hotel

## Deploy

See **DEPLOY.md** — Coolify steps for ntrp.nuraiya.ai (own app + own Postgres).

## Data handling

The only reported national figures are the ~220,000 t/yr of textile waste and
~88% landfill share published at the national initiative's launch (June 2026).
No emirate publishes a textile baseline; every per-emirate row and stream split
in `src/facts` is an indicative allocation, flagged as such, never to be quoted
externally. Network-measured data replaces it. That replacement is the product.
