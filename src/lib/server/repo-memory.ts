import type { CallReceipt, Property, Question, Rule, SpecField } from "@/lib/contract";
import { ConflictError, NotFoundError, type NewProperty, type Repo } from "@/lib/server/repo";

/** In-memory Repo for unit tests. Mirrors the Supabase transaction semantics of answerQuestion. */
export function memoryRepo(seed: { properties?: Property[]; fields?: SpecField[]; rules?: Rule[]; questions?: Question[] } = {}): Repo {
  const properties = new Map((seed.properties ?? []).map((p) => [p.id, p]));
  const fields = new Map<string, SpecField>((seed.fields ?? []).map((f) => [`${f.propertyId}:${f.key}`, f]));
  const rules = new Map((seed.rules ?? []).map((r) => [r.id, r]));
  const questions = new Map((seed.questions ?? []).map((q) => [q.id, q]));
  const calls: CallReceipt[] = [];
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;

  return {
    async listProperties() {
      return [...properties.values()];
    },
    async getProperty(pid) {
      return properties.get(pid) ?? null;
    },
    async allFields() {
      const out = new Map<string, SpecField[]>();
      for (const f of fields.values()) out.set(f.propertyId, [...(out.get(f.propertyId) ?? []), f]);
      return out;
    },
    async fieldsOf(pid) {
      return [...fields.values()].filter((f) => f.propertyId === pid);
    },
    async rules() {
      return [...rules.values()];
    },
    async listQuestions({ status, propertyId }) {
      return [...questions.values()].filter((q) => (!status || q.status === status) && (!propertyId || q.propertyId === propertyId));
    },
    async createQuestion({ propertyId, fieldKey, text }) {
      const existing = [...questions.values()].find((q) => q.propertyId === propertyId && q.fieldKey === fieldKey && q.status === "open");
      if (existing) return existing;
      if (!properties.has(propertyId)) throw new NotFoundError(`property ${propertyId}`);
      const q: Question = { id: id("q"), propertyId, fieldKey, text, status: "open", answer: null, answeredAt: null };
      questions.set(q.id, q);
      return q;
    },
    async answerQuestion(qid, answer, parsed) {
      const q = questions.get(qid);
      if (!q) throw new NotFoundError(`question ${qid}`);
      if (q.status === "answered") throw new ConflictError(`question ${qid} already answered`);
      const done: Question = { ...q, status: "answered", answer, answeredAt: new Date().toISOString() };
      questions.set(qid, done);
      fields.set(`${q.propertyId}:${q.fieldKey}`, {
        propertyId: q.propertyId,
        key: q.fieldKey,
        value: parsed.known ? parsed.value : null,
        status: parsed.known ? "known" : "unknown",
        source: { type: "seller", url: null, page: null, label: "Seller answer" },
        confidence: null,
        note: answer,
      });
      return done;
    },
    async logCall(c) {
      const r: CallReceipt = { id: id("call"), agentId: c.agentId, tool: c.tool, amountUsd: c.amountUsd, paymentRef: c.paymentRef, ts: new Date().toISOString() };
      calls.unshift(r);
      return r;
    },
    async listCalls(limit) {
      return calls.slice(0, limit);
    },
    async upsertProperty(p: NewProperty) {
      const existing = [...properties.values()].find((x) => x.sourceUrl === p.sourceUrl);
      const row: Property = { ...p, id: existing?.id ?? id("p") };
      properties.set(row.id, row);
      return row;
    },
    async replaceFields(pid, fs) {
      for (const k of [...fields.keys()]) if (k.startsWith(`${pid}:`)) fields.delete(k);
      for (const f of fs) fields.set(`${f.propertyId}:${f.key}`, f);
    },
    async upsertRules(rs) {
      for (const r of rs) rules.set(r.id, r);
    },
  };
}
