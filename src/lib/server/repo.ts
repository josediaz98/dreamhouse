/** Persistence boundary. Supabase in production, in-memory in unit tests. */
import type { CallReceipt, FieldValue, McpToolName, Property, Question, QuestionStatus, Rule, SpecField, SpecFieldKey } from "@/lib/contract";

export interface NewProperty extends Omit<Property, "id"> {}

export interface Repo {
  listProperties(): Promise<readonly Property[]>;
  getProperty(id: string): Promise<Property | null>;
  /** Fields of every property, grouped by property id. */
  allFields(): Promise<ReadonlyMap<string, readonly SpecField[]>>;
  fieldsOf(propertyId: string): Promise<readonly SpecField[]>;
  rules(): Promise<readonly Rule[]>;
  listQuestions(filter: { status?: QuestionStatus; propertyId?: string }): Promise<readonly Question[]>;
  /** Idempotent: returns the existing open question for (property, field) when there is one. */
  createQuestion(input: { propertyId: string; fieldKey: SpecFieldKey; text: string }): Promise<Question>;
  /** Updates the question and the matching spec_field in one transaction. `known: false` keeps the field unknown. */
  answerQuestion(id: string, answer: string, parsed: { known: boolean; value: FieldValue }): Promise<Question>;
  logCall(input: { agentId: string; tool: McpToolName; amountUsd: number; paymentRef: string | null }): Promise<CallReceipt>;
  listCalls(limit: number): Promise<readonly CallReceipt[]>;
  // ingestion (service role only)
  upsertProperty(p: NewProperty): Promise<Property>;
  replaceFields(propertyId: string, fields: readonly SpecField[]): Promise<void>;
  upsertRules(rules: readonly Rule[]): Promise<void>;
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
