/**
 * Naseej Textile Recovery Platform — tool catalog.
 *
 * Each tool: name + description + input_schema (what the model sees) and
 * an execute() handler (server-side). Every mutation writes an AuditLog
 * row; sensitive actions (tier changes, registry changes) create
 * ApprovalRequests instead of acting directly — hard rule NTR-2.
 *
 * v0 catalogue:
 *   consult_agent            — ask a backend agent (executed in chat route)
 *   get_partner_profile      — partner record + profile facts + standing
 *   update_partner_profile   — merge durable facts into the profile
 *   list_partners            — registry queries (staff-facing)
 *   list_partner_reports     — report history for a partner
 *   start_or_get_report      — open/find the DRAFT report for a period
 *   record_production        — set activity figures (units, generated, recovered) on a draft
 *   record_waste             — add/replace a textile load record (stream × fate)
 *   submit_report            — DRAFT → SUBMITTED (partner confirmed)
 *   get_report_detail        — full report with records + validation
 *   set_validation_result    — VAL-01: score + notes, SUBMITTED → VALIDATED/RETURNED
 *   approve_report           — staff-context only: VALIDATED → APPROVED
 *   request_tier_change      — CER-01: draft a tier/standing change → approval queue
 *   get_regional_benchmark   — aggregates (min 3 partners) with baseline fallback
 *   get_facts                — sections of the network fact graph
 *   list_documents / read_document — uploaded source files
 *   create_task / update_task_status / list_tasks — internal workstream
 */

import { prisma } from './db';
import type { Agent, User, Prisma } from '@prisma/client';
import {
  NTR_FACTS,
  FACTS_SECTIONS,
  type FactsSection,
  REGION_BASELINE,
} from '@/facts';
import { readStoredFile } from './storage';
import { extractContent } from './document-extract';
import { recordActivity } from './activity';
import {
  resolveQuantity,
  playbackLine,
  type QuantityResolution,
  type ResolutionKind,
} from './arabic';

// ─────────────────────────────────────────────────────────────
// Types (inherited runtime contract)
// ─────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolExecuteContext {
  agent: Agent;
  user: User | null;
  threadId: string | null;
  consultationDepth: number;
  agentRunId?: string;
  /** Id of the Message row the current turn was triggered by — recorded on
   * QuantityResolution rows so an audit can walk figure → partner's words. */
  currentMessageId?: string;
  /** Document ids attached to the current turn (voice notes, weighbridge slips,
   * spreadsheets) — recorded on QuantityResolution rows as sourceDocId. */
  currentAttachmentDocIds?: string[];
}

export interface ToolResult {
  text: string;
  isError?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const REGION_CODES = REGION_BASELINE.map((r) => r.code);

async function audit(
  ctx: ToolExecuteContext,
  action: string,
  target: string,
  detail?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: {
      agentId: ctx.agent.id,
      userId: ctx.user?.id ?? null,
      action: `tool.${action}`,
      entityType: 'tool_call',
      summary: target,
      metadata: detail ?? {},
    },
  });
}

function err(text: string): ToolResult {
  return { text, isError: true };
}

/**
 * Resolve the partner in scope. Partner-linked users (portal accounts) are
 * ALWAYS locked to their own partner — registry_no from the model is ignored
 * for them (hard rule NTR-3). Staff/agents may address any partner by
 * registry number.
 */
async function resolvePartner(ctx: ToolExecuteContext, registryNo?: string) {
  if (ctx.user) {
    const own = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
    if (own) return own; // partner portal user — locked to self
  }
  if (registryNo) {
    return prisma.partner.findUnique({ where: { registryNo } });
  }
  return null;
}

function fmtPartner(p: {
  registryNo: string;
  nameEn: string;
  nameAr: string | null;
  type: string;
  sizeClass: string | null;
  region: string;
  city: string | null;
  tier: string;
  standing: string;
  foundingMember: boolean;
  preferredLang: string;
  contactName: string | null;
  profileFacts: Prisma.JsonValue;
}): string {
  return [
    `Registry no: ${p.registryNo}`,
    `Name: ${p.nameEn}${p.nameAr ? ` / ${p.nameAr}` : ''}`,
    `Type: ${p.type}${p.sizeClass ? ` (${p.sizeClass})` : ''} · Region: ${p.region}${p.city ? ` · ${p.city}` : ''}`,
    `Tier: ${p.tier} · Standing: ${p.standing}${p.foundingMember ? ' · FOUNDING MEMBER' : ''}`,
    `Preferred language: ${p.preferredLang}${p.contactName ? ` · Contact: ${p.contactName}` : ''}`,
    `Profile facts: ${p.profileFacts ? JSON.stringify(p.profileFacts) : '(none recorded yet)'}`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// consult_agent (executed inside the chat route)
// ─────────────────────────────────────────────────────────────

export const CONSULT_AGENT_TOOL: ToolDefinition = {
  name: 'consult_agent',
  description: `Ask a backend network agent a question (int-01 intake/parsing, val-01 validation, ana-01 analytics, cer-01 tiers/certification, eng-01 engagement, reg-01 registry). Bounded: max 3 consultations per turn, depth 2. The partner never sees the consulted agent — relay its substance in your own voice.`,
  input_schema: {
    type: 'object',
    properties: {
      agent_slug: { type: 'string', description: 'One of: int-01, val-01, ana-01, cer-01, eng-01, reg-01, nou-00' },
      question: { type: 'string', description: 'Self-contained question — the consulted agent does not see your conversation.', maxLength: 2000 },
    },
    required: ['agent_slug', 'question'],
  },
};

// ─────────────────────────────────────────────────────────────
// Partner profile tools
// ─────────────────────────────────────────────────────────────

export const GET_PARTNER_PROFILE_TOOL: ToolDefinition = {
  name: 'get_partner_profile',
  description: `Load a partner's record: identity, region, tier, standing, profile facts (the "never ask twice" memory), and recent report summary. Call this BEFORE your first reply in any partner conversation. Partner-portal users are always resolved to their own record; staff pass registry_no.`,
  input_schema: {
    type: 'object',
    properties: {
      registry_no: { type: 'string', description: 'e.g. NTR-DXB-00042 (ignored for partner-portal users — they always get their own record)' },
    },
  },
};

export async function executeGetPartnerProfile(
  input: { registry_no?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const partner = await resolvePartner(ctx, input.registry_no);
  if (!partner) return err('No partner found. For staff queries pass registry_no; for partner conversations the user must be linked to a partner record.');

  const reports = await prisma.quarterlyReport.findMany({
    where: { partnerId: partner.id },
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    take: 6,
    select: { year: true, quarter: true, status: true, confidenceScore: true, submittedAt: true },
  });

  const reportLines = reports.length
    ? reports.map((r) => `- ${r.year} Q${r.quarter}: ${r.status}${r.confidenceScore != null ? ` (confidence ${r.confidenceScore})` : ''}`).join('\n')
    : '(no reports yet — this partner has never reported)';

  await audit(ctx, 'get_partner_profile', partner.registryNo);
  return {
    text: `${fmtPartner(partner)}\n\nRecent reports:\n${reportLines}`,
    effects: { partnerId: partner.id, registryNo: partner.registryNo },
  };
}

export const UPDATE_PARTNER_PROFILE_TOOL: ToolDefinition = {
  name: 'update_partner_profile',
  description: `Merge durable facts into the partner's profile memory (rooms or sites, floor area, material types handled, accepted backing types, processing capacity, preferred contact, seasonal notes). Use whenever you learn something worth never asking again. Keys are free-form snake_case; values are strings/numbers. Does NOT change tier/standing/registry fields.`,
  input_schema: {
    type: 'object',
    properties: {
      registry_no: { type: 'string' },
      facts: { type: 'object', description: 'Key→value facts to merge, e.g. {"units_count": 320, "material_types": "nylon 6, PP", "accepted_backing": "bitumen, latex", "capacity_tpy": 2000}' },
      preferred_lang: { type: 'string', description: '"ar" or "en" — only when the partner states a preference' },
    },
    required: ['facts'],
  },
};

export async function executeUpdatePartnerProfile(
  input: { registry_no?: string; facts: Record<string, unknown>; preferred_lang?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const partner = await resolvePartner(ctx, input.registry_no);
  if (!partner) return err('No partner in scope.');

  const existing = (partner.profileFacts as Record<string, unknown> | null) ?? {};
  const merged = { ...existing, ...input.facts };

  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      profileFacts: merged as Prisma.InputJsonValue,
      ...(input.preferred_lang === 'ar' || input.preferred_lang === 'en'
        ? { preferredLang: input.preferred_lang }
        : {}),
    },
  });

  await audit(ctx, 'update_partner_profile', partner.registryNo, { keys: Object.keys(input.facts) });
  return { text: `Profile updated for ${partner.registryNo}: ${Object.keys(input.facts).join(', ')}.` };
}

export const LIST_PARTNERS_TOOL: ToolDefinition = {
  name: 'list_partners',
  description: `Query the partner registry (staff/backend use). Filter by region, type, tier, standing. Returns up to 25 rows.`,
  input_schema: {
    type: 'object',
    properties: {
      region: { type: 'string', description: `One of: ${REGION_CODES.join(', ')}` },
      type: { type: 'string', description: 'RECYCLER | INSTALLER | DIVERSION_UNIT | CHARITY | HOSPITALITY | FACILITY | RETAILER | MANUFACTURER | HAULIER | SORTER' },
      tier: { type: 'string', description: 'REGISTERED | ACTIVE | CERTIFIED | ELITE' },
      standing: { type: 'string', description: 'GOOD | AT_RISK | PAUSED' },
    },
  },
};

export async function executeListPartners(
  input: { region?: string; type?: string; tier?: string; standing?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  // Partner-portal users may not enumerate the registry (privacy floor).
  if (ctx.user) {
    const own = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
    if (own) return err('Registry enumeration is not available in partner conversations.');
  }

  const where: Prisma.PartnerWhereInput = {};
  if (input.region) where.region = input.region as never;
  if (input.type) where.type = input.type as never;
  if (input.tier) where.tier = input.tier as never;
  if (input.standing) where.standing = input.standing as never;

  const partners = await prisma.partner.findMany({
    where,
    orderBy: { registryNo: 'asc' },
    take: 25,
  });

  await audit(ctx, 'list_partners', JSON.stringify(input));
  if (!partners.length) return { text: 'No partners match.' };
  return {
    text: partners
      .map((p) => `${p.registryNo} · ${p.nameEn} · ${p.type} · ${p.region} · ${p.tier}/${p.standing}`)
      .join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────
// Report lifecycle tools
// ─────────────────────────────────────────────────────────────

export const LIST_PARTNER_REPORTS_TOOL: ToolDefinition = {
  name: 'list_partner_reports',
  description: `List a partner's quarterly reports with status and confidence. Use to know what's on file before asking anything.`,
  input_schema: {
    type: 'object',
    properties: { registry_no: { type: 'string' } },
  },
};

export async function executeListPartnerReports(
  input: { registry_no?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const partner = await resolvePartner(ctx, input.registry_no);
  if (!partner) return err('No partner in scope.');
  const reports = await prisma.quarterlyReport.findMany({
    where: { partnerId: partner.id },
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    include: { production: true, wasteRecords: true },
  });
  await audit(ctx, 'list_partner_reports', partner.registryNo);
  if (!reports.length) return { text: `${partner.registryNo}: no reports on file.` };
  return {
    text: reports
      .map((r) => {
        const waste = r.wasteRecords.map((w) => `${w.stream}:${w.tons}t→${w.fate}`).join(', ');
        return `${r.year} Q${r.quarter} [${r.status}]${r.confidenceScore != null ? ` conf=${r.confidenceScore}` : ''} · generated=${r.production?.textileGeneratedTons ?? '—'}t · recovered=${r.production?.textileRecoveredTons ?? '—'}t · loads: ${waste || '—'} · id=${r.id}`;
      })
      .join('\n'),
  };
}

export const START_OR_GET_REPORT_TOOL: ToolDefinition = {
  name: 'start_or_get_report',
  description: `Open (or fetch, if it exists) the quarterly report for a period. Creates a DRAFT if none exists. Returns the report id used by record_production / record_waste / submit_report.`,
  input_schema: {
    type: 'object',
    properties: {
      registry_no: { type: 'string' },
      year: { type: 'number' },
      quarter: { type: 'number', description: '1-4' },
    },
    required: ['year', 'quarter'],
  },
};

export async function executeStartOrGetReport(
  input: { registry_no?: string; year: number; quarter: number },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const partner = await resolvePartner(ctx, input.registry_no);
  if (!partner) return err('No partner in scope.');
  if (input.quarter < 1 || input.quarter > 4) return err('quarter must be 1-4.');

  const report = await prisma.quarterlyReport.upsert({
    where: { partnerId_year_quarter: { partnerId: partner.id, year: input.year, quarter: input.quarter } },
    update: {},
    create: { partnerId: partner.id, year: input.year, quarter: input.quarter },
    include: { production: true, wasteRecords: true },
  });

  await audit(ctx, 'start_or_get_report', `${partner.registryNo} ${input.year}Q${input.quarter}`, { reportId: report.id });
  const waste = report.wasteRecords.map((w) => `${w.stream}:${w.tons}t→${w.fate}`).join(', ') || '(none)';
  return {
    text: `Report ${report.id} · ${partner.registryNo} · ${input.year} Q${input.quarter} · status=${report.status}\nActivity: ${report.production ? JSON.stringify(report.production) : '(not recorded)'}\nLoad records: ${waste}`,
    effects: { reportId: report.id },
  };
}

// ─────────────────────────────────────────────────────────────
// resolve_quantity — the Arabic layer's gatekeeper tool.
// MUST run before any figure reaches record_* (enforced below, in
// the executors — not just the prompt).
// ─────────────────────────────────────────────────────────────

export const RESOLVE_QUANTITY_TOOL: ToolDefinition = {
  name: 'resolve_quantity',
  description: `REQUIRED before record_waste / record_production whenever a figure came from partner words (chat text, voice transcript, or a document you read). Pass the partner's VERBATIM phrase (raw_text, dialect preserved — e.g. "شلنا 40 بالة بلاط سجاد راحت للتدوير بعد الصيف"). Returns a resolution: kg low–high range, textile stream/fate, material type, reporting period, confidence, and either a resolution_id to pass to record_* OR a clarifying question (in the partner's dialect) when the number can't be resolved without asking. Never pass a number you computed yourself — resolve first.`,
  input_schema: {
    type: 'object',
    properties: {
      raw_text: {
        type: 'string',
        description: "The partner's verbatim words containing the quantity — dialect, transliteration, or mixed script. Do not translate or clean it.",
      },
      kind: {
        type: 'string',
        description: 'WASTE | PRODUCTION | AUTO — WASTE = a load with a stream and fate; PRODUCTION = an activity total (generated/received/recovered tons); AUTO detects.',
      },
    },
    required: ['raw_text'],
  },
};

/**
 * Persist a resolver output as an audit-grade QuantityResolution row and
 * derive the source (voice/doc/chat) from the turn context — the model
 * is never trusted to self-report provenance.
 */
async function persistResolution(
  r: QuantityResolution,
  ctx: ToolExecuteContext,
): Promise<{ id: string }> {
  let source: 'CHAT_TEXT' | 'VOICE_NOTE' | 'IMAGE' | 'DOCUMENT' = 'CHAT_TEXT';
  let sourceDocId: string | null = null;

  const docIds = ctx.currentAttachmentDocIds ?? [];
  if (docIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: docIds } },
      select: { id: true, mimeType: true },
    });
    const audio = docs.find((d) => d.mimeType?.startsWith('audio/'));
    const image = docs.find((d) => d.mimeType?.startsWith('image/'));
    const anyDoc = docs[0];
    if (audio) { source = 'VOICE_NOTE'; sourceDocId = audio.id; }
    else if (image) { source = 'IMAGE'; sourceDocId = image.id; }
    else if (anyDoc) { source = 'DOCUMENT'; sourceDocId = anyDoc.id; }
  }

  const row = await prisma.quantityResolution.create({
    data: {
      rawText: r.rawText,
      normalized: r.normalized,
      kgLow: r.kgLow,
      kgHigh: r.kgHigh,
      kgMid: r.kgMid,
      count: r.count,
      unitCode: r.unitCode,
      quantityIndicative: r.quantityIndicative,
      stream: (r.stream as never) ?? undefined,
      streamMatched: r.streamMatched,
      fate: (r.fate as never) ?? undefined,
      fateMatched: r.fateMatched,
      materialType: r.materialType,
      periodYear: r.period?.year ?? null,
      periodQuarter: r.period?.quarter ?? null,
      periodBasis: r.period?.basis ?? null,
      confidence: r.confidence,
      neededClarification: r.mustClarify,
      clarifyQuestion: r.clarifyQuestion,
      source,
      sourceMessageId: ctx.currentMessageId ?? null,
      sourceDocId,
      notes: r.notes as unknown as Prisma.InputJsonValue,
    },
  });
  return { id: row.id };
}

function formatResolutionForModel(id: string, r: QuantityResolution): string {
  const lines: string[] = [
    `resolution_id: ${id}`,
    `playback: ${playbackLine(r)}`,
  ];
  if (r.kgMid !== null) {
    lines.push(
      `quantity: ${r.kgLow}–${r.kgHigh} kg (midpoint ${r.kgMid} kg / ${(r.kgMid / 1000).toFixed(2)} t)` +
      (r.quantityIndicative ? ' — INDICATIVE range from a local unit estimate' : ''),
    );
  }
  if (r.stream) lines.push(`stream: ${r.stream} (matched "${r.streamMatched}")`);
  if (r.fate) lines.push(`fate: ${r.fate} (matched "${r.fateMatched}")`);
  else if (r.stream) lines.push('fate: UNKNOWN — ask where it went');
  if (r.materialType) lines.push(`material_type: ${r.materialType}`);
  if (r.period) lines.push(`period: ${r.period.year} Q${r.period.quarter} (via "${r.period.matched}", ${r.period.confidence})`);
  lines.push(`confidence: ${r.confidence}`);
  if (r.mustClarify) {
    lines.push(`MUST_CLARIFY — do NOT record yet. Ask the partner exactly this (their dialect): "${r.clarifyQuestion}"`);
  } else {
    lines.push('READY — pass this resolution_id to record_waste / record_production after the partner confirms the playback.');
  }
  return lines.join('\n');
}

export async function executeResolveQuantity(
  input: { raw_text: string; kind?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  if (!input.raw_text?.trim()) {
    return err('resolve_quantity requires raw_text — the partner\'s verbatim words.');
  }
  const kind: ResolutionKind =
    input.kind === 'WASTE' || input.kind === 'PRODUCTION' ? input.kind : 'AUTO';
  const r = resolveQuantity(input.raw_text, kind);
  const { id } = await persistResolution(r, ctx);
  await audit(ctx, 'resolve_quantity', id, {
    rawText: r.rawText,
    kgMid: r.kgMid,
    unit: r.unitCode,
    stream: r.stream,
    confidence: r.confidence,
    mustClarify: r.mustClarify,
  });
  return { text: formatResolutionForModel(id, r), effects: { resolutionId: id } };
}

/** Resolve + persist an inline raw_text (record_* called without a prior
 * resolve_quantity call — the gate resolves it anyway so nothing is
 * recorded without provenance). The caller decides whether a
 * mustClarify result blocks recording. */
async function resolveInline(
  rawText: string,
  kind: 'WASTE' | 'PRODUCTION',
  ctx: ToolExecuteContext,
): Promise<{ r: QuantityResolution; id: string }> {
  const r = resolveQuantity(rawText, kind);
  // Persist even when unresolved — an unresolvable utterance is
  // audit-worthy too (neededClarification records what was said).
  const { id } = await persistResolution(r, ctx);
  return { r, id };
}

export const RECORD_PRODUCTION_TOOL: ToolDefinition = {
  name: 'record_production',
  description: `Set the activity figures on a DRAFT/RETURNED report AFTER the partner confirms them. Sources (hotels, FM, installers, retailers, manufacturers): textile_generated_tons = textile removed or generated in the quarter; textile_recovered_tons = the part that left to a productive fate. Recyclers, sorters, diversion units: textile_generated_tons = received; textile_recovered_tons = output to a productive fate; use processing_capacity_tons for capacity. units_count = rooms / sites / jobs / stores depending on partner type. Overwrites previous values for provided fields only.

PROVENANCE GATE: when the figures came from partner words, pass resolution_id (from resolve_quantity) — or raw_text and the executor resolves it first. Bare tonnage with no provenance is rejected.`,
  input_schema: {
    type: 'object',
    properties: {
      report_id: { type: 'string' },
      resolution_id: { type: 'string', description: 'QuantityResolution.id returned by resolve_quantity. The recorded tonnage defaults to its kg midpoint.' },
      raw_text: { type: 'string', description: "Partner's verbatim quantity phrase — resolved internally if no resolution_id." },
      units_count: { type: 'number', description: 'Rooms / sites / jobs / stores, by partner type' },
      textile_generated_tons: { type: 'number', description: 'Explicit tons generated or received — overrides the resolution midpoint when the partner stated an exact figure.' },
      textile_recovered_tons: { type: 'number', description: 'Tons that left to a productive fate (reuse, donation, recycling, downcycling, export)' },
      material_types: { type: 'array', items: { type: 'string' }, description: 'e.g. ["nylon 6", "PP", "cotton", "poly-cotton"]' },
      processing_capacity_tons: { type: 'number' },
      notes: { type: 'string' },
    },
    required: ['report_id'],
  },
};

export async function executeRecordProduction(
  input: {
    report_id: string;
    resolution_id?: string;
    raw_text?: string;
    units_count?: number;
    textile_generated_tons?: number;
    textile_recovered_tons?: number;
    material_types?: string[];
    processing_capacity_tons?: number;
    notes?: string;
  },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const report = await prisma.quarterlyReport.findUnique({
    where: { id: input.report_id },
    include: { partner: true },
  });
  if (!report) return err('Report not found.');
  if (report.status !== 'DRAFT' && report.status !== 'RETURNED')
    return err(`Report is ${report.status} — activity figures can only change on DRAFT/RETURNED reports.`);

  // ── Provenance gate ──────────────────────────────────────────
  // A figure from partner words must come through the Arabic resolver.
  const carriesTonnage = input.textile_generated_tons !== undefined || input.textile_recovered_tons !== undefined;
  let resolutionId: string | null = input.resolution_id ?? null;
  if (resolutionId) {
    const res = await prisma.quantityResolution.findUnique({ where: { id: resolutionId } });
    if (!res) return err(`resolution_id ${resolutionId} not found — call resolve_quantity with the partner's exact words first.`);
    if (res.neededClarification) {
      return err(`Resolution ${resolutionId} was flagged MUST_CLARIFY — ask the partner "${res.clarifyQuestion ?? 'confirm the quantity'}" and resolve their reply first.`);
    }
    if (res.kgMid !== null && input.textile_generated_tons === undefined && input.textile_recovered_tons === undefined) {
      input = { ...input, textile_generated_tons: res.kgMid / 1000 };
    }
    if (res.materialType && input.material_types === undefined) {
      input = { ...input, material_types: [res.materialType] };
    }
  } else if (input.raw_text) {
    const { r, id } = await resolveInline(input.raw_text, 'PRODUCTION', ctx);
    resolutionId = id;
    if (r.mustClarify) {
      return err(`Resolution ${resolutionId} was flagged MUST_CLARIFY — ask the partner "${r.clarifyQuestion ?? 'confirm the quantity'}" and resolve their reply first.`);
    }
    if (r.kgMid === null) {
      return err(`Could not resolve a figure from "${input.raw_text}". Ask the partner: "${r.clarifyQuestion ?? 'كم الكمية بالكيلو أو الطن؟'}" then resolve_quantity their reply.`);
    }
    if (!carriesTonnage) {
      input = { ...input, textile_generated_tons: r.kgMid / 1000 };
      if (r.materialType && !input.material_types) input = { ...input, material_types: [r.materialType] };
    }
  } else if (carriesTonnage && !input.resolution_id) {
    return err('Tonnage with no provenance is rejected. Call resolve_quantity with the partner\'s exact words first (or pass raw_text) — every recorded figure must trace to what they said.');
  }

  const data = {
    ...(input.units_count !== undefined ? { unitsCount: Math.round(input.units_count) } : {}),
    ...(input.textile_generated_tons !== undefined ? { textileGeneratedTons: input.textile_generated_tons } : {}),
    ...(input.textile_recovered_tons !== undefined ? { textileRecoveredTons: input.textile_recovered_tons } : {}),
    ...(input.material_types !== undefined ? { materialTypes: input.material_types } : {}),
    ...(input.processing_capacity_tons !== undefined ? { processingCapacityTons: input.processing_capacity_tons } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(resolutionId ? { resolutionId } : {}),
  };

  await prisma.productionRecord.upsert({
    where: { reportId: report.id },
    update: data,
    create: { reportId: report.id, ...data },
  });

  // Thread the source doc (voice note, weighbridge slip photo) onto the report
  // so the audit trail is figure → resolution → source.
  if (resolutionId) await linkResolutionSourceToReport(resolutionId, report.id);

  await audit(ctx, 'record_production', report.id, data as Prisma.InputJsonValue);
  return { text: `Activity recorded on ${report.partner.registryNo} ${report.year} Q${report.quarter}: ${JSON.stringify(data)}${resolutionId ? ` (resolution ${resolutionId})` : ''}` };
}

export const RECORD_WASTE_TOOL: ToolDefinition = {
  name: 'record_waste',
  description: `Add or replace ONE textile load record (stream × fate) on a DRAFT/RETURNED report after partner confirmation. One record per (stream, fate) pair — recording the same pair again replaces it. destination_registry_no when material went to another network member (enables chain-of-custody reconciliation). Landfilled loads are recorded too, with the reason in notes.

PROVENANCE GATE: the quantity must come through resolve_quantity. Pass resolution_id (preferred — stream/fate/tons are taken from the resolution and only need to be repeated if you are correcting them) or raw_text. Bare tons with no provenance are rejected.`,
  input_schema: {
    type: 'object',
    properties: {
      report_id: { type: 'string' },
      resolution_id: { type: 'string', description: 'QuantityResolution.id from resolve_quantity. Stream/fate/tonnage default from it.' },
      raw_text: { type: 'string', description: "Partner's verbatim quantity phrase — resolved internally if no resolution_id." },
      stream: { type: 'string', description: 'PI_CARPET | PC_CARPET_TILE | PC_CARPET_BROADLOOM | APPAREL_WEARABLE | APPAREL_NONWEARABLE | HOSPITALITY_TEXTILE | TECHNICAL_TEXTILE | TURF | OTHER — defaults to the resolution\'s matched stream' },
      fate: { type: 'string', description: 'REUSED | DONATED | RECYCLED_POLYMER | RECYCLED_FIBER | DOWNCYCLED | EXPORTED | INCINERATED | LANDFILLED | UNKNOWN — defaults to the resolution\'s matched fate' },
      tons: { type: 'number', description: 'Explicit tons — overrides the resolution midpoint when the partner stated an exact figure' },
      destination_registry_no: { type: 'string' },
      notes: { type: 'string' },
    },
    required: ['report_id'],
  },
};

export async function executeRecordWaste(
  input: {
    report_id: string;
    resolution_id?: string;
    raw_text?: string;
    stream?: string;
    fate?: string;
    tons?: number;
    destination_registry_no?: string;
    notes?: string;
  },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const report = await prisma.quarterlyReport.findUnique({
    where: { id: input.report_id },
    include: { partner: true },
  });
  if (!report) return err('Report not found.');
  if (report.status !== 'DRAFT' && report.status !== 'RETURNED')
    return err(`Report is ${report.status} — load records can only change on DRAFT/RETURNED reports.`);

  // ── Provenance gate ──────────────────────────────────────────
  // resolve_quantity must produce the number — enforced here, in code.
  let resolutionId: string | null = input.resolution_id ?? null;
  if (resolutionId) {
    const res = await prisma.quantityResolution.findUnique({ where: { id: resolutionId } });
    if (!res) return err(`resolution_id ${resolutionId} not found — call resolve_quantity with the partner's exact words first.`);
    if (res.neededClarification) {
      return err(`Resolution ${resolutionId} was flagged MUST_CLARIFY — ask the partner "${res.clarifyQuestion ?? 'confirm the quantity'}" and resolve their reply first.`);
    }
    input.stream = input.stream ?? res.stream ?? undefined;
    input.fate = input.fate ?? res.fate ?? undefined;
    if (input.tons === undefined && res.kgMid !== null) input.tons = res.kgMid / 1000;
  } else if (input.raw_text) {
    const { r, id } = await resolveInline(input.raw_text, 'WASTE', ctx);
    resolutionId = id;
    if (r.mustClarify || r.kgMid === null) {
      if (input.tons === undefined) {
        return err(`Could not resolve a quantity from "${input.raw_text}". Ask the partner: "${r.clarifyQuestion ?? 'كم الكمية؟'}" then resolve_quantity their reply.`);
      }
      // explicit tons + unresolvable text — record with the (flagged) resolution attached
    } else {
      input.stream = input.stream ?? r.stream ?? undefined;
      input.fate = input.fate ?? r.fate ?? undefined;
      if (input.tons === undefined) input.tons = r.kgMid! / 1000;
    }
  } else if (input.tons !== undefined) {
    return err('Tonnage with no provenance is rejected. Call resolve_quantity with the partner\'s exact words first (or pass raw_text) — every recorded figure must trace to what they said.');
  }

  if (input.tons === undefined) return err('No tonnage resolved. Call resolve_quantity on the partner\'s words first.');
  if (input.tons < 0) return err('tons must be ≥ 0.');

  const STREAMS = [...NTR_FACTS.taxonomy.wasteStreams.map((w) => w.code)] as string[];
  const FATES = [...NTR_FACTS.taxonomy.wasteFates] as string[];
  if (!input.stream || !STREAMS.includes(input.stream))
    return err(`stream must be one of ${STREAMS.join(', ')} — the resolution didn\'t identify one; ask what the load is (موكيت؟ بلاط سجاد؟ ملابس؟ مفارش؟ بانرات؟).`);
  if (!input.fate || !FATES.includes(input.fate))
    return err(`fate must be one of ${FATES.join(', ')} — the resolution didn\'t identify one; ask where the load went (تبرع؟ تدوير؟ تصدير؟ مكب؟)`);

  if (input.destination_registry_no) {
    const dest = await prisma.partner.findUnique({ where: { registryNo: input.destination_registry_no } });
    if (!dest) return err(`destination_registry_no ${input.destination_registry_no} is not in the registry. Confirm the receiving party — or omit and note it in notes.`);
  }

  // Replace any existing record for the same (stream, fate)
  await prisma.wasteRecord.deleteMany({
    where: { reportId: report.id, stream: input.stream as never, fate: input.fate as never },
  });
  await prisma.wasteRecord.create({
    data: {
      reportId: report.id,
      stream: input.stream as never,
      fate: input.fate as never,
      tons: input.tons,
      destinationRegistryNo: input.destination_registry_no ?? null,
      notes: input.notes ?? null,
      resolutionId,
    },
  });

  // Thread the source doc (voice note, weighbridge slip photo) onto the report.
  if (resolutionId) await linkResolutionSourceToReport(resolutionId, report.id);

  await audit(ctx, 'record_waste', report.id, input as unknown as Prisma.InputJsonValue);
  return { text: `Load recorded on ${report.partner.registryNo} ${report.year} Q${report.quarter}: ${input.stream} ${input.tons}t → ${input.fate}${input.destination_registry_no ? ` (to ${input.destination_registry_no})` : ''}${resolutionId ? ` (resolution ${resolutionId})` : ''}` };
}

/** When a resolution carries a source document (voice note, weighbridge
 * slip photo), append it to the report's sourceDocIds — the audit trail is
 * figure → resolution → partner's words → original media. */
async function linkResolutionSourceToReport(resolutionId: string, reportId: string) {
  const res = await prisma.quantityResolution.findUnique({
    where: { id: resolutionId },
    select: { sourceDocId: true },
  });
  if (!res?.sourceDocId) return;
  await prisma.quarterlyReport.update({
    where: { id: reportId },
    data: { sourceDocIds: { push: res.sourceDocId } },
  });
}

export const SUBMIT_REPORT_TOOL: ToolDefinition = {
  name: 'submit_report',
  description: `Submit a DRAFT/RETURNED report for validation after the partner explicitly confirms the figures. Sets status=SUBMITTED. Irreversible from the partner side — further changes only if validation returns it.`,
  input_schema: {
    type: 'object',
    properties: { report_id: { type: 'string' } },
    required: ['report_id'],
  },
};

export async function executeSubmitReport(
  input: { report_id: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const report = await prisma.quarterlyReport.findUnique({
    where: { id: input.report_id },
    include: { partner: true, production: true, wasteRecords: true },
  });
  if (!report) return err('Report not found.');
  if (report.status !== 'DRAFT' && report.status !== 'RETURNED')
    return err(`Report is already ${report.status}.`);
  if (!report.production && report.wasteRecords.length === 0)
    return err('Report has no activity figures and no load records — nothing to submit.');

  await prisma.quarterlyReport.update({
    where: { id: report.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  await audit(ctx, 'submit_report', report.id);
  await recordActivity({
    kind: 'REPORT_SUBMITTED',
    actorAgent: ctx.agent,
    actorUser: ctx.user ?? undefined,
    entityType: 'QuarterlyReport',
    entityId: report.id,
    title: `${report.partner.registryNo} submitted ${report.year} Q${report.quarter}`,
    summary: `Generated ${report.production?.textileGeneratedTons ?? '—'}t · recovered ${report.production?.textileRecoveredTons ?? '—'}t · ${report.wasteRecords.length} load records`,
  });

  return {
    text: `Report ${report.id} SUBMITTED for ${report.partner.registryNo} ${report.year} Q${report.quarter}. Validation runs next; thank the partner and deliver their benchmark.`,
    effects: { reportId: report.id, status: 'SUBMITTED' },
  };
}

export const GET_REPORT_DETAIL_TOOL: ToolDefinition = {
  name: 'get_report_detail',
  description: `Full detail of one report: activity figures, load records (stream × fate), status, validation notes, source documents.`,
  input_schema: {
    type: 'object',
    properties: { report_id: { type: 'string' } },
    required: ['report_id'],
  },
};

export async function executeGetReportDetail(
  input: { report_id: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const r = await prisma.quarterlyReport.findUnique({
    where: { id: input.report_id },
    include: { partner: true, production: true, wasteRecords: true },
  });
  if (!r) return err('Report not found.');
  await audit(ctx, 'get_report_detail', r.id);
  return {
    text: [
      `Report ${r.id} · ${r.partner.registryNo} (${r.partner.nameEn}, ${r.partner.type}, ${r.partner.region}) · ${r.year} Q${r.quarter} · status=${r.status}`,
      `Confidence: ${r.confidenceScore ?? '—'} · Submitted: ${r.submittedAt?.toISOString() ?? '—'}`,
      `Production: ${r.production ? JSON.stringify(r.production) : '(none)'}`,
      `Loads: ${r.wasteRecords.map((w) => `${w.stream} ${w.tons}t → ${w.fate}${w.destinationRegistryNo ? ` (to ${w.destinationRegistryNo})` : ''}`).join(' · ') || '(none)'}`,
      `Source docs: ${r.sourceDocIds.join(', ') || '(none)'}`,
      r.validationNotes ? `Validation notes:\n${r.validationNotes}` : '',
    ].filter(Boolean).join('\n'),
  };
}

export const SET_VALIDATION_RESULT_TOOL: ToolDefinition = {
  name: 'set_validation_result',
  description: `VAL-01 only. Record the validation outcome on a SUBMITTED report: confidence score 0-100 + Markdown notes. score ≥ 70 → VALIDATED; score < 70 → RETURNED (with clarifying questions in the notes for Noura to relay).`,
  input_schema: {
    type: 'object',
    properties: {
      report_id: { type: 'string' },
      confidence_score: { type: 'number' },
      notes: { type: 'string', description: 'Markdown: CHECKED / DEVIATIONS / RECOMMENDATION (+ questions if returning)' },
    },
    required: ['report_id', 'confidence_score', 'notes'],
  },
};

export async function executeSetValidationResult(
  input: { report_id: string; confidence_score: number; notes: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  if (ctx.agent.slug !== 'val-01' && ctx.agent.slug !== 'nou-00')
    return err('Only val-01 (or nou-00 relaying) may set validation results.');
  const report = await prisma.quarterlyReport.findUnique({
    where: { id: input.report_id },
    include: { partner: true },
  });
  if (!report) return err('Report not found.');
  if (report.status !== 'SUBMITTED') return err(`Report is ${report.status}, not SUBMITTED.`);

  const score = Math.max(0, Math.min(100, Math.round(input.confidence_score)));
  const next = score >= 70 ? 'VALIDATED' : 'RETURNED';

  await prisma.quarterlyReport.update({
    where: { id: report.id },
    data: {
      status: next,
      confidenceScore: score,
      validationNotes: input.notes,
      validatedAt: new Date(),
    },
  });

  await audit(ctx, 'set_validation_result', report.id, { score, next });
  await recordActivity({
    kind: 'REPORT_VALIDATED',
    actorAgent: ctx.agent,
    entityType: 'QuarterlyReport',
    entityId: report.id,
    title: `${report.partner.registryNo} ${report.year} Q${report.quarter} → ${next} (confidence ${score})`,
    severity: next === 'RETURNED' ? 'WARNING' : 'INFO',
  });

  return { text: `Report ${report.id} → ${next} with confidence ${score}.` };
}

export const APPROVE_REPORT_TOOL: ToolDefinition = {
  name: 'approve_report',
  description: `Staff-context only (network console conversations — never partner chats). Move a VALIDATED report to APPROVED so it counts toward tier standing and national statistics.`,
  input_schema: {
    type: 'object',
    properties: { report_id: { type: 'string' } },
    required: ['report_id'],
  },
};

export async function executeApproveReport(
  input: { report_id: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  // Guard: only in a staff conversation (user with no linked partner).
  if (!ctx.user) return err('approve_report requires a signed-in network staff conversation.');
  const linked = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
  if (linked) return err('approve_report is not available in partner conversations.');

  const report = await prisma.quarterlyReport.findUnique({
    where: { id: input.report_id },
    include: { partner: true },
  });
  if (!report) return err('Report not found.');
  if (report.status !== 'VALIDATED') return err(`Report is ${report.status}, not VALIDATED.`);

  await prisma.quarterlyReport.update({
    where: { id: report.id },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });

  await audit(ctx, 'approve_report', report.id, { byUser: ctx.user.email });
  await recordActivity({
    kind: 'REPORT_APPROVED',
    actorAgent: ctx.agent,
    actorUser: ctx.user,
    entityType: 'QuarterlyReport',
    entityId: report.id,
    title: `${report.partner.registryNo} ${report.year} Q${report.quarter} APPROVED`,
  });

  return { text: `Report ${report.id} APPROVED. Tier eligibility should be recomputed (consult cer-01).` };
}

// ─────────────────────────────────────────────────────────────
// Tier change (draft → human approval; hard rule NTR-2)
// ─────────────────────────────────────────────────────────────

export const REQUEST_TIER_CHANGE_TOOL: ToolDefinition = {
  name: 'request_tier_change',
  description: `Draft a tier and/or standing change for a partner → lands in the network approval queue. NOTHING is granted until an official approves. Include the full evidence trail. The change applies automatically on approval.`,
  input_schema: {
    type: 'object',
    properties: {
      registry_no: { type: 'string' },
      to_tier: { type: 'string', description: 'REGISTERED | ACTIVE | CERTIFIED | ELITE (omit to keep current)' },
      to_standing: { type: 'string', description: 'GOOD | AT_RISK | PAUSED (omit to keep current)' },
      reason: { type: 'string', description: 'One-line reason shown in the queue' },
      evidence: { type: 'string', description: 'Markdown evidence trail: which reports, scores, dates' },
    },
    required: ['registry_no', 'reason', 'evidence'],
  },
};

export async function executeRequestTierChange(
  input: { registry_no: string; to_tier?: string; to_standing?: string; reason: string; evidence: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const partner = await prisma.partner.findUnique({ where: { registryNo: input.registry_no } });
  if (!partner) return err('Partner not found.');
  if (!input.to_tier && !input.to_standing) return err('Provide to_tier and/or to_standing.');

  const TIERS = ['REGISTERED', 'ACTIVE', 'CERTIFIED', 'ELITE'];
  const STANDINGS = ['GOOD', 'AT_RISK', 'PAUSED'];
  if (input.to_tier && !TIERS.includes(input.to_tier)) return err(`to_tier must be one of ${TIERS.join(', ')}`);
  if (input.to_standing && !STANDINGS.includes(input.to_standing)) return err(`to_standing must be one of ${STANDINGS.join(', ')}`);

  const approval = await prisma.approvalRequest.create({
    data: {
      kind: 'TIER_CHANGE',
      severity: input.to_standing === 'PAUSED' ? 'HIGH' : 'MEDIUM',
      agentId: ctx.agent.id,
      requesterUserId: ctx.user?.id ?? null,
      threadId: ctx.threadId,
      summary: `${partner.registryNo} (${partner.nameEn}): ${partner.tier}/${partner.standing} → ${input.to_tier ?? partner.tier}/${input.to_standing ?? partner.standing} — ${input.reason}`,
      detail: input.evidence,
      payload: {
        partnerId: partner.id,
        registryNo: partner.registryNo,
        fromTier: partner.tier,
        toTier: input.to_tier ?? partner.tier,
        fromStanding: partner.standing,
        toStanding: input.to_standing ?? partner.standing,
        reason: input.reason,
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await audit(ctx, 'request_tier_change', partner.registryNo, { approvalId: approval.id });
  await recordActivity({
    kind: 'TIER_CHANGE_REQUESTED',
    actorAgent: ctx.agent,
    entityType: 'ApprovalRequest',
    entityId: approval.id,
    title: `Tier change drafted: ${approval.summary}`,
  });

  return {
    text: `Tier change drafted (approval ${approval.id}) — awaiting network official approval. Do NOT announce it to the partner as granted; say it has been submitted for the network's approval.`,
    effects: { approvalId: approval.id },
  };
}

// ─────────────────────────────────────────────────────────────
// Benchmarks
// ─────────────────────────────────────────────────────────────

export const GET_REGIONAL_BENCHMARK_TOOL: ToolDefinition = {
  name: 'get_regional_benchmark',
  description: `Regional aggregates for benchmarking a partner. Uses MEASURED data (APPROVED reports) when ≥ 3 partners have reported in the region+type; otherwise falls back to the INDICATIVE emirate baseline, clearly labeled. Never returns another partner's individual figures.`,
  input_schema: {
    type: 'object',
    properties: {
      region: { type: 'string', description: `One of: ${REGION_CODES.join(', ')}` },
      partner_type: { type: 'string', description: 'RECYCLER | INSTALLER | DIVERSION_UNIT | CHARITY | HOSPITALITY | FACILITY | RETAILER | MANUFACTURER | HAULIER | SORTER' },
      year: { type: 'number' },
      quarter: { type: 'number' },
    },
    required: ['region'],
  },
};

export async function executeGetRegionalBenchmark(
  input: { region: string; partner_type?: string; year?: number; quarter?: number },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const baseline = REGION_BASELINE.find((r) => r.code === input.region);
  if (!baseline) return err(`Unknown region. Use one of: ${REGION_CODES.join(', ')}`);

  const reportWhere: Prisma.QuarterlyReportWhereInput = {
    status: 'APPROVED',
    partner: {
      region: input.region as never,
      ...(input.partner_type ? { type: input.partner_type as never } : {}),
    },
    ...(input.year ? { year: input.year } : {}),
    ...(input.quarter ? { quarter: input.quarter } : {}),
  };

  const reports = await prisma.quarterlyReport.findMany({
    where: reportWhere,
    include: { production: true, wasteRecords: true },
  });

  const distinctPartners = new Set(reports.map((r) => r.partnerId)).size;
  await audit(ctx, 'get_regional_benchmark', input.region, { distinctPartners });

  if (distinctPartners >= 3) {
    const generated = reports.map((r) => r.production?.textileGeneratedTons ?? 0).filter((x) => x > 0);
    const units = reports.map((r) => r.production?.unitsCount ?? 0).filter((x) => x > 0);
    const loads = reports.flatMap((r) => r.wasteRecords);
    const loadTons = loads.reduce((a, w) => a + w.tons, 0);
    const divertedFates = NTR_FACTS.taxonomy.divertedFates as readonly string[];
    const divertedTons = loads
      .filter((w) => divertedFates.includes(w.fate))
      .reduce((a, w) => a + w.tons, 0);
    const landfilledTons = loads.filter((w) => w.fate === 'LANDFILLED').reduce((a, w) => a + w.tons, 0);
    const avgKgPerUnit =
      generated.length && units.length
        ? Math.round((generated.reduce((a, b) => a + b, 0) * 1000) / units.reduce((a, b) => a + b, 0))
        : null;

    return {
      text: [
        `MEASURED benchmark — ${baseline.nameEn} (${baseline.nameAr})${input.partner_type ? ` · ${input.partner_type}` : ''} · ${distinctPartners} partners, ${reports.length} approved reports`,
        `Avg textile generated/received per reporting partner: ${(generated.reduce((a, b) => a + b, 0) / Math.max(generated.length, 1)).toFixed(1)} t`,
        avgKgPerUnit ? `Avg: ~${avgKgPerUnit} kg per unit (room / site / job / store, as reported)` : '',
        `Diversion rate (${divertedFates.join('+')} / total logged): ${loadTons > 0 ? Math.round((divertedTons / loadTons) * 100) : 0}%`,
        `Landfilled share: ${loadTons > 0 ? Math.round((landfilledTons / loadTons) * 100) : 0}% (national reference ~88%, reported June 2026)`,
        `(Aggregates only — individual partner figures are never disclosed.)`,
      ].filter(Boolean).join('\n'),
    };
  }

  return {
    text: [
      `INDICATIVE baseline — ${baseline.nameEn} (${baseline.nameAr}) — fewer than 3 partners have measured data here yet; figures below are the network's indicative allocation of the national figure (label them as such, never as measured):`,
      `Textile waste: ~${baseline.textileWasteTons.toLocaleString('en-US')} t/yr · Landfilled: ~${baseline.landfilledTons.toLocaleString('en-US')} t (88%)`,
      `Indicative stream split: carpet ${baseline.carpetTons.toLocaleString('en-US')} t · apparel ${baseline.apparelTons.toLocaleString('en-US')} t · hospitality textiles ${baseline.hospitalityTextileTons.toLocaleString('en-US')} t · other ${baseline.otherTextileTons.toLocaleString('en-US')} t`,
      baseline.recyclers != null ? `Recyclers: ${baseline.recyclers} · Sorters: ${baseline.sorters ?? '—'} · Collection points: ${baseline.collectionPoints ?? '—'}` : 'Recycler, sorter and collection-point counts are not centrally published for this emirate — the network is counting them.',
      `National context: ~220,000 t of textile waste per year, ~88% to landfill (reported June 2026) — every diverted ton is a measurable contribution.`,
    ].join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────
// Facts
// ─────────────────────────────────────────────────────────────

export const GET_FACTS_TOOL: ToolDefinition = {
  name: 'get_facts',
  description: `Read a section of the network fact graph: ${FACTS_SECTIONS.join(' | ')}. Use for canonical taxonomy, tier rules, baseline figures, engagement doctrine.`,
  input_schema: {
    type: 'object',
    properties: {
      section: { type: 'string', description: FACTS_SECTIONS.join(' | ') },
    },
    required: ['section'],
  },
};

export async function executeGetFacts(
  input: { section: FactsSection },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  await audit(ctx, 'get_facts', input.section);
  switch (input.section) {
    case 'identity':
      return { text: JSON.stringify(NTR_FACTS.identity, null, 2) };
    case 'taxonomy':
      return { text: JSON.stringify(NTR_FACTS.taxonomy, null, 2) };
    case 'regions':
      return { text: JSON.stringify(NTR_FACTS.regions, null, 2) };
    case 'tiers':
      return { text: JSON.stringify(NTR_FACTS.tiers, null, 2) };
    case 'baseline':
      return { text: JSON.stringify(NTR_FACTS.baseline, null, 2) };
    case 'engagement':
      return { text: JSON.stringify(NTR_FACTS.engagement, null, 2) };
    case 'esg':
      return { text: JSON.stringify(NTR_FACTS.esg, null, 2) };
    case 'rules':
      return { text: NTR_FACTS.hardRules.map((r) => `[${r.id} · ${r.severity}] ${r.rule}`).join('\n') };
    default:
      return err(`Unknown section. Use: ${FACTS_SECTIONS.join(', ')}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Documents (uploaded source files: Excel, weighbridge slips, voice notes)
// ─────────────────────────────────────────────────────────────

export const LIST_DOCUMENTS_TOOL: ToolDefinition = {
  name: 'list_documents',
  description: `List recently uploaded documents (title, kind, id). Source files for reports arrive here via chat attachments.`,
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Substring filter on title' },
      limit: { type: 'number', description: 'Default 15, max 50' },
    },
  },
};

export async function executeListDocuments(
  input: { query?: string; limit?: number },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const docs = await prisma.document.findMany({
    where: input.query ? { title: { contains: input.query, mode: 'insensitive' } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Math.min(input.limit ?? 15, 50),
    select: { id: true, title: true, kind: true, mimeType: true, createdAt: true },
  });
  await audit(ctx, 'list_documents', input.query ?? '(all)');
  if (!docs.length) return { text: 'No documents found.' };
  return {
    text: docs
      .map((d) => `${d.id} · ${d.title} · ${d.kind} · ${d.mimeType ?? '?'} · ${d.createdAt.toISOString().slice(0, 10)}`)
      .join('\n'),
  };
}

export const READ_DOCUMENT_TOOL: ToolDefinition = {
  name: 'read_document',
  description: `Read an uploaded document's extracted content (Excel → tables, PDF/docx → text). Use on report source files before asking the partner anything.`,
  input_schema: {
    type: 'object',
    properties: { document_id: { type: 'string' } },
    required: ['document_id'],
  },
};

export async function executeReadDocument(
  input: { document_id: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const doc = await prisma.document.findUnique({ where: { id: input.document_id } });
  if (!doc) return err('Document not found.');
  if (doc.ipSensitivity === 'INVESTOR_RESTRICTED' || doc.ipSensitivity === 'IP_CRITICAL')
    return err('This document is restricted.');

  await audit(ctx, 'read_document', doc.id, { title: doc.title });

  if (doc.extractedText) return { text: `# ${doc.title}\n\n${doc.extractedText.slice(0, 60_000)}` };

  if (doc.storagePath) {
    try {
      const buf = await readStoredFile(doc.storagePath);
      const extracted = await extractContent(buf, doc.mimeType ?? '', doc.title);
      if (extracted.kind === 'text' && extracted.text) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { extractedText: extracted.text },
        });
        return { text: `# ${doc.title}\n\n${extracted.text.slice(0, 60_000)}` };
      }
      return err(`Document is ${extracted.kind} — not text-extractable here. If it is an image, it can be attached directly in chat for visual reading.`);
    } catch (e) {
      return err(`Could not read stored file: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }
  return err('Document has no stored content.');
}

// ─────────────────────────────────────────────────────────────
// Internal workstream (tasks)
// ─────────────────────────────────────────────────────────────

export const CREATE_TASK_TOOL: ToolDefinition = {
  name: 'create_task',
  description: `Open an internal task (network operations workstream). Use for follow-ups: audits to schedule, campaigns to prepare, data gaps to chase.`,
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      priority: { type: 'string', description: 'P0 | P1 | P2 | P3 (default P2)' },
      due_date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['title'],
  },
};

export async function executeCreateTask(
  input: { title: string; description?: string; priority?: string; due_date?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!project) return err('No project exists — seed the database first.');

  const priority = ['P0', 'P1', 'P2', 'P3'].includes(input.priority ?? '') ? input.priority : 'P2';
  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      title: input.title,
      description: input.description ?? null,
      priority: priority as never,
      dueDate: input.due_date ? new Date(input.due_date) : null,
      ownerAgentId: ctx.agent.id,
      authorAgentId: ctx.agent.id,
    },
  });
  await audit(ctx, 'create_task', task.id, { title: input.title });
  return { text: `Task created: ${task.id} — ${task.title} [${task.priority}]` };
}

export const UPDATE_TASK_STATUS_TOOL: ToolDefinition = {
  name: 'update_task_status',
  description: `Update a task's status: TODO | IN_PROGRESS | BLOCKED | DONE | CANCELLED.`,
  input_schema: {
    type: 'object',
    properties: {
      task_id: { type: 'string' },
      status: { type: 'string' },
      note: { type: 'string' },
    },
    required: ['task_id', 'status'],
  },
};

export async function executeUpdateTaskStatus(
  input: { task_id: string; status: string; note?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];
  if (!STATUSES.includes(input.status)) return err(`status must be one of ${STATUSES.join(', ')}`);
  const task = await prisma.task.findUnique({ where: { id: input.task_id } });
  if (!task) return err('Task not found.');

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: input.status as never,
      lastActivityAt: new Date(),
      completedAt: input.status === 'DONE' ? new Date() : null,
    },
  });
  if (input.note) {
    await prisma.taskComment.create({
      data: { taskId: task.id, authorAgentId: ctx.agent.id, body: input.note },
    });
  }
  await audit(ctx, 'update_task_status', task.id, { status: input.status });
  return { text: `Task ${task.id} → ${input.status}` };
}

export const LIST_TASKS_TOOL: ToolDefinition = {
  name: 'list_tasks',
  description: `List internal tasks (default: open tasks you own).`,
  input_schema: {
    type: 'object',
    properties: {
      all_agents: { type: 'boolean', description: 'true = whole team, default false (yours only)' },
      include_done: { type: 'boolean' },
    },
  },
};

export async function executeListTasks(
  input: { all_agents?: boolean; include_done?: boolean },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const tasks = await prisma.task.findMany({
    where: {
      ...(input.all_agents ? {} : { ownerAgentId: ctx.agent.id }),
      ...(input.include_done ? {} : { status: { notIn: ['DONE', 'CANCELLED'] } }),
    },
    orderBy: { lastActivityAt: 'desc' },
    take: 25,
    include: { ownerAgent: { select: { slug: true } } },
  });
  await audit(ctx, 'list_tasks', JSON.stringify(input));
  if (!tasks.length) return { text: 'No matching tasks.' };
  return {
    text: tasks
      .map((t) => `${t.id} · [${t.priority}] ${t.status} · ${t.title} · owner=${t.ownerAgent?.slug ?? '—'}${t.dueDate ? ` · due ${t.dueDate.toISOString().slice(0, 10)}` : ''}`)
      .join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────
// Portal services — chat-first paths (Noura acts for the partner)
// ─────────────────────────────────────────────────────────────

export const CREATE_COLLECTION_TICKET_TOOL: ToolDefinition = {
  name: 'create_collection_ticket',
  description: `Open a pickup request for a textile load for the partner in this conversation (partner-linked users only). Registered recyclers, sorters, hauliers and diversion units in their emirate see it immediately. Confirm stream + estimated quantity with the partner BEFORE calling.`,
  input_schema: {
    type: 'object',
    properties: {
      stream: { type: 'string', description: 'PI_CARPET | PC_CARPET_TILE | PC_CARPET_BROADLOOM | APPAREL_WEARABLE | APPAREL_NONWEARABLE | HOSPITALITY_TEXTILE | TECHNICAL_TEXTILE | TURF | OTHER' },
      estimated_tons: { type: 'number' },
      location_note: { type: 'string', description: 'Pickup guidance, e.g. "Loading dock B, after 10pm"' },
      notes: { type: 'string' },
    },
    required: ['stream', 'estimated_tons'],
  },
};

export async function executeCreateCollectionTicket(
  input: { stream: string; estimated_tons: number; location_note?: string; notes?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  if (!ctx.user) return err('Partner conversation required.');
  const partner = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
  if (!partner) return err('This user is not linked to a partner record — tickets are created by partners (or via the staff console).');
  const STREAMS = [...NTR_FACTS.taxonomy.wasteStreams.map((w) => w.code)] as string[];
  if (!STREAMS.includes(input.stream)) return err(`stream must be one of ${STREAMS.join(', ')}`);
  if (!input.estimated_tons || input.estimated_tons <= 0) return err('estimated_tons must be > 0.');

  const ticket = await prisma.collectionTicket.create({
    data: {
      partnerId: partner.id,
      stream: input.stream as never,
      estimatedTons: input.estimated_tons,
      region: partner.region,
      city: partner.city,
      locationNote: input.location_note ?? null,
      notes: input.notes ?? null,
    },
  });
  await audit(ctx, 'create_collection_ticket', ticket.id, { stream: input.stream, tons: input.estimated_tons });
  return {
    text: `Pickup request ${ticket.id} opened: ${input.stream} · ${input.estimated_tons}t · region ${partner.region}. Recyclers, sorters and hauliers in the emirate can now claim it — the partner can track it under Portal → Pickups.`,
    effects: { ticketId: ticket.id },
  };
}

export const SUBMIT_PORTAL_APPLICATION_TOOL: ToolDefinition = {
  name: 'submit_application',
  description: `Submit an award/honor/grant/mention application for the partner in this conversation. Draft the title and case WITH the partner, read it back for confirmation, then submit. Decision is the network's (it lands in their review queue).`,
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', description: 'AWARD | HONOR | GRANT | MENTION' },
      title: { type: 'string' },
      body: { type: 'string', description: 'The partner’s case, as confirmed with them' },
    },
    required: ['kind', 'title', 'body'],
  },
};

export async function executeSubmitApplication(
  input: { kind: string; title: string; body: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  if (!ctx.user) return err('Partner conversation required.');
  const partner = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
  if (!partner) return err('This user is not linked to a partner record.');
  const KINDS = ['AWARD', 'HONOR', 'GRANT', 'MENTION'];
  if (!KINDS.includes(input.kind)) return err(`kind must be one of ${KINDS.join(', ')}`);

  const app = await prisma.application.create({
    data: { partnerId: partner.id, kind: input.kind as never, title: input.title, body: input.body },
  });
  await audit(ctx, 'submit_application', app.id, { kind: input.kind });
  return {
    text: `Application ${app.id} submitted to the network (${input.kind}: "${input.title}"). Status is trackable under Portal → Applications. Do not promise an outcome — the decision is the network's.`,
    effects: { applicationId: app.id },
  };
}

export const LOG_SUGGESTION_TOOL: ToolDefinition = {
  name: 'log_suggestion',
  description: `Record a request, feedback, idea, or complaint from the partner in this conversation so network staff see it in their queue. Use whenever the partner voices something the network should hear — with their consent.`,
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', description: 'REQUEST | FEEDBACK | IDEA | COMPLAINT' },
      body: { type: 'string', description: 'The partner’s point, faithfully summarized' },
    },
    required: ['kind', 'body'],
  },
};

export async function executeLogSuggestion(
  input: { kind: string; body: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  if (!ctx.user) return err('Partner conversation required.');
  const partner = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
  if (!partner) return err('This user is not linked to a partner record.');
  const KINDS = ['REQUEST', 'FEEDBACK', 'IDEA', 'COMPLAINT'];
  if (!KINDS.includes(input.kind)) return err(`kind must be one of ${KINDS.join(', ')}`);

  const s = await prisma.suggestion.create({
    data: { partnerId: partner.id, kind: input.kind as never, body: input.body },
  });
  await audit(ctx, 'log_suggestion', s.id, { kind: input.kind });
  return { text: `Recorded for network staff (${input.kind}). Thank the partner — the network reads every one.`, effects: { suggestionId: s.id } };
}

// ─────────────────────────────────────────────────────────────
// bulk_register_partners — staff-context onboarding power move.
// Noura reads ANY membership spreadsheet/list a staff member pastes or
// uploads, normalizes it, and registers the whole batch with sequential
// registry numbers per region. Partner-portal users can never call this.
// ─────────────────────────────────────────────────────────────

export const REGION_REGISTRY_CODE: Record<string, string> = {
  ABU_DHABI: 'AUH', DUBAI: 'DXB', SHARJAH: 'SHJ', AJMAN: 'AJM',
  UMM_AL_QUWAIN: 'UAQ', RAS_AL_KHAIMAH: 'RAK', FUJAIRAH: 'FUJ',
};

export async function nextRegistryNo(region: string, offsetCache: Map<string, number>): Promise<string> {
  const code = REGION_REGISTRY_CODE[region] ?? region.slice(0, 3).toUpperCase();
  const prefix = `NTR-${code}-`;
  if (!offsetCache.has(code)) {
    const last = await prisma.partner.findFirst({
      where: { registryNo: { startsWith: prefix } },
      orderBy: { registryNo: 'desc' },
      select: { registryNo: true },
    });
    offsetCache.set(code, last ? parseInt(last.registryNo.slice(prefix.length), 10) : 0);
  }
  const next = (offsetCache.get(code) ?? 0) + 1;
  offsetCache.set(code, next);
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export const BULK_REGISTER_PARTNERS_TOOL: ToolDefinition = {
  name: 'bulk_register_partners',
  description: `STAFF ONLY — register a batch of partners in one call (max 100 rows). Use when network staff provide a member list in any format (spreadsheet, pasted table, document): first normalize every row yourself (map their emirate names to region codes, their business descriptions to partner types), then call once with the clean rows. Registry numbers are assigned automatically and sequentially per region. Rows whose name already exists in that region are skipped as duplicates, not overwritten. NEVER invent partners — only register rows the staff member actually supplied.`,
  input_schema: {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        description: 'Normalized partner rows extracted from the staff-provided list',
        items: {
          type: 'object',
          properties: {
            name_en: { type: 'string' },
            name_ar: { type: 'string' },
            type: { type: 'string', enum: ['RECYCLER', 'INSTALLER', 'DIVERSION_UNIT', 'CHARITY', 'HOSPITALITY', 'FACILITY', 'RETAILER', 'MANUFACTURER', 'HAULIER', 'SORTER'] },
            region: { type: 'string', enum: REGION_CODES },
            city: { type: 'string' },
            size_class: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
            contact_name: { type: 'string' },
            subtype: { type: 'string', description: 'Free text, e.g. RECYCLER: POLYMER | FIBER | MIXED · HOSPITALITY: HOTEL | MALL | AIRPORT' },
            units_count: { type: 'number', description: 'Rooms / sites / stores, if the list has it' },
            material_types: { type: 'string', description: 'e.g. "nylon 6, PP" or "cotton, poly-cotton"' },
          },
          required: ['name_en', 'type', 'region'],
        },
      },
      source_note: { type: 'string', description: 'One line describing where this list came from, e.g. "Dubai hotel housekeeping contacts, June 2026 — provided by the FM association"' },
    },
    required: ['rows'],
  },
};

interface BulkRow {
  name_en: string; name_ar?: string; type: string; region: string; city?: string;
  size_class?: string; contact_name?: string; subtype?: string; units_count?: number; material_types?: string;
}

export async function executeBulkRegisterPartners(
  input: { rows: BulkRow[]; source_note?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  // Hard gate: a partner-linked user can never bulk-register (NTR-3).
  if (ctx.user) {
    const linked = await prisma.partner.findUnique({ where: { userId: ctx.user.id } });
    if (linked) return err('Not available to partner accounts. Registration batches are run by network staff.');
  }

  if (!Array.isArray(input.rows) || input.rows.length === 0) return err('No rows supplied.');
  if (input.rows.length > 100) return err(`Batch too large (${input.rows.length}). Split into batches of 100 or fewer.`);

  const offsetCache = new Map<string, number>();
  const created: string[] = [];
  const skipped: string[] = [];
  const rejected: string[] = [];

  for (const row of input.rows) {
    if (!row.name_en?.trim() || !REGION_CODES.includes(row.region) ||
        !['RECYCLER', 'INSTALLER', 'DIVERSION_UNIT', 'CHARITY', 'HOSPITALITY', 'FACILITY', 'RETAILER', 'MANUFACTURER', 'HAULIER', 'SORTER'].includes(row.type)) {
      rejected.push(row.name_en ?? '(unnamed)');
      continue;
    }
    const dup = await prisma.partner.findFirst({
      where: { nameEn: { equals: row.name_en.trim(), mode: 'insensitive' }, region: row.region as never },
    });
    if (dup) {
      skipped.push(`${row.name_en} → already registered as ${dup.registryNo}`);
      continue;
    }
    const registryNo = await nextRegistryNo(row.region, offsetCache);
    const facts: Record<string, unknown> = {};
    if (row.units_count) facts.units_count = row.units_count;
    if (row.material_types) facts.material_types = row.material_types;
    if (input.source_note) facts.registration_source = input.source_note;

    await prisma.partner.create({
      data: {
        registryNo,
        nameEn: row.name_en.trim(),
        nameAr: row.name_ar?.trim() || null,
        type: row.type as never,
        region: row.region as never,
        city: row.city?.trim() || null,
        sizeClass: (row.size_class && ['SMALL', 'MEDIUM', 'LARGE'].includes(row.size_class)
          ? row.size_class
          : null) as never,
        contactName: row.contact_name?.trim() || null,
        subtype: row.subtype?.trim() || null,
        profileFacts: Object.keys(facts).length ? (facts as Prisma.InputJsonValue) : undefined,
      },
    });
    created.push(`${registryNo} · ${row.name_en.trim()}`);
  }

  await audit(ctx, 'bulk_register_partners', `${created.length} created, ${skipped.length} skipped`, {
    created: created.length, skipped: skipped.length, rejected: rejected.length,
    sourceNote: input.source_note ?? null,
  });

  if (created.length > 0) {
    await prisma.activityEvent.create({
      data: {
        kind: 'PARTNER_ONBOARDED',
        severity: 'NOTABLE',
        title: `Bulk registration: ${created.length} partners added${input.source_note ? ` (${input.source_note})` : ''}`,
        payload: { registryNos: created.map((c) => c.split(' · ')[0]) },
      },
    });
  }

  const lines = [
    `Registered ${created.length} partner(s):`,
    ...created.map((c) => `  ${c}`),
  ];
  if (skipped.length) lines.push(`Skipped ${skipped.length} duplicate(s):`, ...skipped.map((s) => `  ${s}`));
  if (rejected.length) lines.push(`Rejected ${rejected.length} invalid row(s) (missing name/region/type): ${rejected.join(', ')}`);
  lines.push('Give the staff member the new registry numbers. New partners start at REGISTERED tier.');
  return { text: lines.join('\n'), effects: { created: created.length, skipped: skipped.length } };
}

// ─────────────────────────────────────────────────────────────
// Catalog assembly — per-agent tool surfaces
// ─────────────────────────────────────────────────────────────

const PARTNER_FACING_TOOLS: ToolDefinition[] = [
  GET_PARTNER_PROFILE_TOOL,
  UPDATE_PARTNER_PROFILE_TOOL,
  LIST_PARTNER_REPORTS_TOOL,
  START_OR_GET_REPORT_TOOL,
  RESOLVE_QUANTITY_TOOL,
  RECORD_PRODUCTION_TOOL,
  RECORD_WASTE_TOOL,
  SUBMIT_REPORT_TOOL,
  GET_REGIONAL_BENCHMARK_TOOL,
  GET_FACTS_TOOL,
  LIST_DOCUMENTS_TOOL,
  READ_DOCUMENT_TOOL,
  CREATE_TASK_TOOL,
  CONSULT_AGENT_TOOL,
];

const BACKEND_COMMON: ToolDefinition[] = [
  GET_PARTNER_PROFILE_TOOL,
  LIST_PARTNER_REPORTS_TOOL,
  GET_REPORT_DETAIL_TOOL,
  GET_REGIONAL_BENCHMARK_TOOL,
  GET_FACTS_TOOL,
  CREATE_TASK_TOOL,
  UPDATE_TASK_STATUS_TOOL,
  LIST_TASKS_TOOL,
  CONSULT_AGENT_TOOL,
];

/** Which tools each agent slug may use. Unknown slugs get the backend common set. */
export function toolsForAgent(slug: string): ToolDefinition[] {
  switch (slug) {
    case 'nou-00':
      return [...PARTNER_FACING_TOOLS, GET_REPORT_DETAIL_TOOL, SET_VALIDATION_RESULT_TOOL, APPROVE_REPORT_TOOL, LIST_PARTNERS_TOOL, REQUEST_TIER_CHANGE_TOOL, UPDATE_TASK_STATUS_TOOL, LIST_TASKS_TOOL, CREATE_COLLECTION_TICKET_TOOL, SUBMIT_PORTAL_APPLICATION_TOOL, LOG_SUGGESTION_TOOL, BULK_REGISTER_PARTNERS_TOOL];
    case 'int-01':
      return [READ_DOCUMENT_TOOL, LIST_DOCUMENTS_TOOL, GET_PARTNER_PROFILE_TOOL, LIST_PARTNER_REPORTS_TOOL, GET_REPORT_DETAIL_TOOL, GET_FACTS_TOOL, RESOLVE_QUANTITY_TOOL];
    case 'val-01':
      return [...BACKEND_COMMON, SET_VALIDATION_RESULT_TOOL];
    case 'ana-01':
      return [...BACKEND_COMMON, LIST_PARTNERS_TOOL, QUERY_SECTOR_METRICS_TOOL];
    case 'cer-01':
      return [...BACKEND_COMMON, REQUEST_TIER_CHANGE_TOOL, LIST_PARTNERS_TOOL];
    case 'eng-01':
      return BACKEND_COMMON;
    case 'reg-01':
      return [...BACKEND_COMMON, LIST_PARTNERS_TOOL, UPDATE_PARTNER_PROFILE_TOOL, BULK_REGISTER_PARTNERS_TOOL];
    default:
      return BACKEND_COMMON;
  }
}

// ─────────────────────────────────────────────────────────────
// query_sector_metrics — powers "Ask the Sector". Structured,
// aggregate-only reads over approved reports so an agent can answer
// natural-language questions from live data. Never returns partner-level
// rows (rule NTR-3): every cut is an aggregate, and per-emirate rows are
// suppressed below MIN_AGGREGATE partners.
// ─────────────────────────────────────────────────────────────

export const QUERY_SECTOR_METRICS_TOOL: ToolDefinition = {
  name: 'query_sector_metrics',
  description: `Read live, AGGREGATE sector metrics to answer questions about the network. Never exposes a single partner's figures. Use this to answer officials' questions like "which emirates are behind on reporting?", "how many tons of textiles were diverted this year?", "what's our estimated climate contribution?". Returns JSON you then explain in the user's language (Arabic or English). Choose a metric and optionally a breakdown.`,
  input_schema: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        description: 'overview | participation | production | diversion | esg | tiers. "production" = textile tons generated/received by reporting partners. "overview" returns the headline national numbers.',
      },
      group_by: {
        type: 'string',
        description: 'Optional breakdown: emirate | type | tier. Omit for national totals.',
      },
    },
    required: ['metric'],
  },
};

export async function executeQuerySectorMetrics(
  input: { metric?: string; group_by?: string },
  ctx: ToolExecuteContext,
): Promise<ToolResult> {
  const { buildSectorReport } = await import('./sector-report');
  const report = await buildSectorReport();
  const metric = (input.metric ?? 'overview').toLowerCase();
  const groupBy = (input.group_by ?? '').toLowerCase();

  const emirateCut = (pick: (e: (typeof report.emirates)[number]) => unknown) =>
    report.emirates.map((e) => ({ emirate: e.nameEn, emirateAr: e.nameAr, baseline: e.baselineQuality, value: pick(e) }));

  let payload: unknown;
  switch (metric) {
    case 'participation':
      payload = groupBy === 'emirate'
        ? { note: 'Aggregate; emirates with <3 partners folded out.', byEmirate: emirateCut((e) => ({ partners: e.partners, reporting: e.reportingPartners, ratePct: e.reportingRatePct })) }
        : { registeredPartners: report.totals.partners, reportingThisYear: report.totals.reportingPartners, participationRatePct: report.totals.participationRatePct, approvedReports: report.totals.approvedReports };
      break;
    case 'production':
      payload = groupBy === 'emirate'
        ? { unit: 'tons', byEmirate: emirateCut((e) => e.productionTons) }
        : { unit: 'tons', totalReported: report.totals.productionTons };
      break;
    case 'diversion':
      payload = groupBy === 'emirate'
        ? { byEmirate: emirateCut((e) => ({ divertedTons: e.divertedTons, diversionRatePct: e.diversionRatePct })) }
        : { divertedTons: report.totals.divertedTons, diversionRatePct: report.totals.diversionRatePct };
      break;
    case 'esg':
      payload = {
        indicative: true,
        note: 'Indicative estimate (placeholder factor); not verified carbon accounting or credits.',
        annualAvoidedTCO2e: report.netZero.annualAvoidedTCO2e,
        cumulativeAvoidedTCO2e: report.netZero.cumulativeAvoidedTCO2e,
        contributingPartners: report.netZero.contributingPartners,
        netZeroTargetYear: report.netZero.currentYear + report.netZero.yearsToTarget,
        ...(groupBy === 'emirate' ? { byEmirate: emirateCut((e) => e.estAvoidedTCO2e) } : {}),
      };
      break;
    case 'tiers':
      payload = { byTier: report.byTier };
      break;
    case 'overview':
    default:
      payload = {
        year: report.year,
        partners: report.totals.partners,
        participationRatePct: report.totals.participationRatePct,
        productionTons: report.totals.productionTons,
        divertedTons: report.totals.divertedTons,
        diversionRatePct: report.totals.diversionRatePct,
        estAvoidedTCO2e_indicative: report.netZero.annualAvoidedTCO2e,
        byType: report.byType,
      };
  }

  await audit(ctx, 'query_sector_metrics', `${metric}${groupBy ? '/' + groupBy : ''}`);
  return { text: JSON.stringify({ metric, groupBy: groupBy || null, data: payload }, null, 2) };
}

/** Full catalog (deduped) — used by the chat route for dispatch. */
export const ALL_TOOLS: ToolDefinition[] = [
  QUERY_SECTOR_METRICS_TOOL,
  CONSULT_AGENT_TOOL,
  GET_PARTNER_PROFILE_TOOL,
  UPDATE_PARTNER_PROFILE_TOOL,
  LIST_PARTNERS_TOOL,
  LIST_PARTNER_REPORTS_TOOL,
  START_OR_GET_REPORT_TOOL,
  RESOLVE_QUANTITY_TOOL,
  RECORD_PRODUCTION_TOOL,
  RECORD_WASTE_TOOL,
  SUBMIT_REPORT_TOOL,
  GET_REPORT_DETAIL_TOOL,
  SET_VALIDATION_RESULT_TOOL,
  APPROVE_REPORT_TOOL,
  REQUEST_TIER_CHANGE_TOOL,
  GET_REGIONAL_BENCHMARK_TOOL,
  GET_FACTS_TOOL,
  LIST_DOCUMENTS_TOOL,
  READ_DOCUMENT_TOOL,
  CREATE_TASK_TOOL,
  UPDATE_TASK_STATUS_TOOL,
  LIST_TASKS_TOOL,
  CREATE_COLLECTION_TICKET_TOOL,
  SUBMIT_PORTAL_APPLICATION_TOOL,
  LOG_SUGGESTION_TOOL,
  BULK_REGISTER_PARTNERS_TOOL,
];

