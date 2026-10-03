/** Supabase-backed Repo. Service role only: import from server routes and scripts, never from client code. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import {
  TABLES,
  type CallReceipt,
  type FieldStatus,
  type FieldValue,
  type McpToolName,
  type Property,
  type Question,
  type QuestionStatus,
  type Rule,
  type SourceRef,
  type SourceType,
  type SpecField,
  type SpecFieldKey,
} from "@/lib/contract";
import { ConflictError, NotFoundError, type NewProperty, type Repo } from "@/lib/server/repo";

type Row = Record<string, unknown>;
type RealtimeTransport = NonNullable<NonNullable<NonNullable<Parameters<typeof createClient>[2]>["realtime"]>["transport"]>;

const s = (v: unknown): string | null => (typeof v === "string" ? v : null);
const n = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

function property(r: Row): Property {
  return {
    id: String(r.id),
    apn: s(r.apn),
    address: String(r.address),
    sourceUrl: String(r.source_url),
    priceUsd: n(r.price_usd),
    acres: n(r.acres),
    snapshotAt: String(r.snapshot_at),
    isFixture: r.is_fixture === true,
  };
}

function specField(r: Row): SpecField {
  const type = s(r.source_type) as SourceType | null;
  const source: SourceRef | null = type ? { type, url: s(r.source_url), page: n(r.source_page), label: s(r.source_label) ?? type } : null;
  return {
    propertyId: String(r.property_id),
    key: String(r.key) as SpecFieldKey,
    value: (r.value ?? null) as FieldValue,
    status: String(r.status) as FieldStatus,
    source,
    confidence: n(r.confidence),
    note: s(r.note),
  };
}

function rule(r: Row): Rule {
  return {
    id: String(r.id),
    jurisdiction: String(r.jurisdiction),
    key: String(r.key) as Rule["key"],
    operator: String(r.operator) as Rule["operator"],
    value: Number(r.value),
    unit: String(r.unit) as Rule["unit"],
    condition: s(r.condition),
    source: { type: "manual", url: s(r.source_url), page: n(r.page), label: String(r.source_label) },
  };
}

function question(r: Row): Question {
  return {
    id: String(r.id),
    propertyId: String(r.property_id),
    fieldKey: String(r.field_key) as SpecFieldKey,
    text: String(r.text),
    status: String(r.status) as QuestionStatus,
    answer: s(r.answer),
    answeredAt: s(r.answered_at),
  };
}

function receipt(r: Row): CallReceipt {
  return {
    id: String(r.id),
    agentId: String(r.agent_id),
    tool: String(r.tool) as McpToolName,
    amountUsd: Number(r.amount_usd),
    paymentRef: s(r.payment_ref),
    ts: String(r.ts),
  };
}

function ok<T>(res: { data: T | null; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new NotFoundError(what);
  return res.data;
}

/** `ws` because Node 20 has no global WebSocket and supabase-js builds a realtime client eagerly. */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ConfigError("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: ws as unknown as RealtimeTransport } });
}

export class ConfigError extends Error {}

export function supabaseRepo(db: SupabaseClient = serviceClient()): Repo {
  return {
    async listProperties() {
      return ok(await db.from(TABLES.properties).select("*").order("price_usd", { ascending: true }), "properties").map(property);
    },
    async getProperty(id) {
      const { data, error } = await db.from(TABLES.properties).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`property: ${error.message}`);
      return data ? property(data) : null;
    },
    async allFields() {
      const rows = ok(await db.from(TABLES.specFields).select("*"), "spec_fields").map(specField);
      const out = new Map<string, SpecField[]>();
      for (const f of rows) out.set(f.propertyId, [...(out.get(f.propertyId) ?? []), f]);
      return out;
    },
    async fieldsOf(propertyId) {
      return ok(await db.from(TABLES.specFields).select("*").eq("property_id", propertyId), "spec_fields").map(specField);
    },
    async rules() {
      return ok(await db.from(TABLES.rules).select("*"), "rules").map(rule);
    },
    async listQuestions({ status, propertyId }) {
      let q = db.from(TABLES.questions).select("*").order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      if (propertyId) q = q.eq("property_id", propertyId);
      return ok(await q, "questions").map(question);
    },
    async createQuestion({ propertyId, fieldKey, text }) {
      const open = await db.from(TABLES.questions).select("*").eq("property_id", propertyId).eq("field_key", fieldKey).eq("status", "open").maybeSingle();
      if (open.error) throw new Error(`question: ${open.error.message}`);
      if (open.data) return question(open.data);
      return question(ok(await db.from(TABLES.questions).insert({ property_id: propertyId, field_key: fieldKey, text }).select("*").single(), "question"));
    },
    async answerQuestion(id, answer, parsed) {
      const res = await db.rpc("answer_question", { p_question_id: id, p_answer: answer, p_value: parsed.value, p_known: parsed.known });
      if (res.error) {
        if (res.error.code === "P0002") throw new ConflictError(`question ${id} not found or already answered`);
        throw new Error(`answer_question: ${res.error.message}`);
      }
      return question(res.data as Row);
    },
    async logCall({ agentId, tool, amountUsd, paymentRef }) {
      return receipt(ok(await db.from(TABLES.calls).insert({ agent_id: agentId, tool, amount_usd: amountUsd, payment_ref: paymentRef }).select("*").single(), "call"));
    },
    async listCalls(limit) {
      return ok(await db.from(TABLES.calls).select("*").order("ts", { ascending: false }).limit(limit), "calls").map(receipt);
    },
    async upsertProperty(p: NewProperty) {
      return property(
        ok(
          await db
            .from(TABLES.properties)
            .upsert(
              { apn: p.apn, address: p.address, source_url: p.sourceUrl, price_usd: p.priceUsd, acres: p.acres, snapshot_at: p.snapshotAt, is_fixture: p.isFixture },
              { onConflict: "source_url" },
            )
            .select("*")
            .single(),
          "property",
        ),
      );
    },
    async replaceFields(propertyId, fields) {
      const del = await db.from(TABLES.specFields).delete().eq("property_id", propertyId);
      if (del.error) throw new Error(`spec_fields delete: ${del.error.message}`);
      const ins = await db.from(TABLES.specFields).insert(
        fields.map((f) => ({
          property_id: f.propertyId,
          key: f.key,
          value: f.value,
          status: f.status,
          source_type: f.source?.type ?? null,
          source_url: f.source?.url ?? null,
          source_page: f.source?.page ?? null,
          source_label: f.source?.label ?? null,
          confidence: f.confidence,
          note: f.note,
        })),
      );
      if (ins.error) throw new Error(`spec_fields insert: ${ins.error.message}`);
    },
    async upsertRules(rules) {
      const res = await db.from(TABLES.rules).upsert(
        rules.map((r) => ({
          id: r.id,
          jurisdiction: r.jurisdiction,
          key: r.key,
          operator: r.operator,
          value: r.value,
          unit: r.unit,
          condition: r.condition,
          source_doc: r.source.label,
          source_url: r.source.url,
          page: r.source.page ?? 0,
          source_label: r.source.label,
        })),
      );
      if (res.error) throw new Error(`rules upsert: ${res.error.message}`);
    },
  };
}
