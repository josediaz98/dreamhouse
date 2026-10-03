import type {
  AskSellerInput,
  AskSellerOutput,
  CallReceipt,
  CheckBuildabilityInput,
  CheckBuildabilityOutput,
  GetSpecInput,
  GetSpecOutput,
  Question,
  QuestionStatus,
  SearchItem,
  SearchPropertiesInput,
  SearchPropertiesOutput,
} from "@/lib/contract";
import { FIXTURE_PROPERTIES } from "@/lib/fixtures";
import {
  applyAnswer,
  applyAsk,
  loadState,
  recordCall,
} from "@/lib/client/fixture-store";

/** Realistic network feel: 300-900 ms. */
function delay(): Promise<void> {
  const ms = 300 + Math.random() * 600;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findProperty(propertyId: string) {
  const property = FIXTURE_PROPERTIES.find((p) => p.id === propertyId);
  if (!property) throw new Error(`Unknown property ${propertyId}`);
  return property;
}

export async function search(input: SearchPropertiesInput): Promise<SearchPropertiesOutput> {
  await delay();
  recordCall("search_properties");
  const state = loadState();
  const items: SearchItem[] = FIXTURE_PROPERTIES.filter(
    (p) =>
      (input.maxPriceUsd === undefined || (p.priceUsd ?? 0) <= input.maxPriceUsd) &&
      (input.minAcres === undefined || (p.acres ?? 0) >= input.minAcres) &&
      (input.maxAcres === undefined || (p.acres ?? 0) <= input.maxAcres),
  ).map((property) => {
    const fields = state.fields.filter((f) => f.propertyId === property.id);
    const result = state.results.find((r) => r.propertyId === property.id);
    return {
      property,
      knownCount: fields.filter((f) => f.status === "known").length,
      unknownCount: fields.filter((f) => f.status !== "known").length,
      overall: input.program && result ? result.overall : null,
    };
  });
  return {
    items,
    eliminatedCount: input.program ? items.filter((i) => i.overall === "fail").length : 0,
  };
}

export async function getSpec(input: GetSpecInput): Promise<GetSpecOutput> {
  await delay();
  recordCall("get_spec");
  const property = findProperty(input.propertyId);
  return {
    property,
    fields: loadState().fields.filter((f) => f.propertyId === input.propertyId),
  };
}

export async function checkBuildability(
  input: CheckBuildabilityInput,
): Promise<CheckBuildabilityOutput> {
  await delay();
  recordCall("check_buildability");
  const result = loadState().results.find((r) => r.propertyId === input.propertyId);
  if (!result) throw new Error(`No buildability result for ${input.propertyId}`);
  return result;
}

export async function askSeller(input: AskSellerInput): Promise<AskSellerOutput> {
  await delay();
  recordCall("ask_seller");
  return { question: applyAsk(input.propertyId, input.fieldKey, input.text) };
}

export async function listQuestions(
  status: QuestionStatus | undefined,
): Promise<readonly Question[]> {
  await delay();
  const { questions } = loadState();
  return status ? questions.filter((q) => q.status === status) : questions;
}

export async function answerQuestion(id: string, answer: string): Promise<Question> {
  await delay();
  const question = applyAnswer(id, answer);
  if (!question) throw new Error(`Unknown question ${id}`);
  return question;
}

export async function listCalls(): Promise<readonly CallReceipt[]> {
  await delay();
  return loadState().calls;
}
