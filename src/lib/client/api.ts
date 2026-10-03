/**
 * One typed function per route in API_ROUTES. Set NEXT_PUBLIC_USE_FIXTURES=1 to serve
 * fixtures; any other value calls the real routes. That env var is the only switch.
 */
import {
  API_ROUTES,
  type AskSellerInput,
  type AskSellerOutput,
  type CallReceipt,
  type CheckBuildabilityInput,
  type CheckBuildabilityOutput,
  type GetSpecInput,
  type GetSpecOutput,
  type McpToolIO,
  type McpToolName,
  type Question,
  type QuestionStatus,
  type SearchPropertiesInput,
  type SearchPropertiesOutput,
} from "@/lib/contract";
import * as fixtureApi from "@/lib/client/fixture-api";

export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES === "1";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const reason =
      response.status === 402 ? "Payment required (HTTP 402)" : `Request failed (${response.status})`;
    throw new ApiError(response.status, `${reason}: ${url}`);
  }
  const body: unknown = await response.json();
  return body;
}

async function callTool<T extends McpToolName>(
  tool: T,
  input: McpToolIO[T]["input"],
): Promise<McpToolIO[T]["output"]> {
  const body = await request(API_ROUTES.tool(tool), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!isRecord(body)) throw new ApiError(502, `Malformed response from ${tool}`);
  return body as unknown as McpToolIO[T]["output"];
}

export function searchProperties(
  input: SearchPropertiesInput = {},
): Promise<SearchPropertiesOutput> {
  return USE_FIXTURES ? fixtureApi.search(input) : callTool("search_properties", input);
}

export function getSpec(input: GetSpecInput): Promise<GetSpecOutput> {
  return USE_FIXTURES ? fixtureApi.getSpec(input) : callTool("get_spec", input);
}

export function checkBuildability(
  input: CheckBuildabilityInput,
): Promise<CheckBuildabilityOutput> {
  return USE_FIXTURES
    ? fixtureApi.checkBuildability(input)
    : callTool("check_buildability", input);
}

export function askSeller(input: AskSellerInput): Promise<AskSellerOutput> {
  return USE_FIXTURES ? fixtureApi.askSeller(input) : callTool("ask_seller", input);
}

export async function listQuestions(status?: QuestionStatus): Promise<readonly Question[]> {
  if (USE_FIXTURES) return fixtureApi.listQuestions(status);
  const url = status ? `${API_ROUTES.questions}?status=${status}` : API_ROUTES.questions;
  const body = await request(url);
  if (!isRecord(body) || !Array.isArray(body.questions)) {
    throw new ApiError(502, "Malformed response from /api/questions");
  }
  return body.questions as Question[];
}

export async function answerQuestion(id: string, answer: string): Promise<Question> {
  if (USE_FIXTURES) return fixtureApi.answerQuestion(id, answer);
  const body = await request(API_ROUTES.answerQuestion(id), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answer }),
  });
  if (!isRecord(body) || !isRecord(body.question)) {
    throw new ApiError(502, "Malformed response from answer route");
  }
  return body.question as unknown as Question;
}

export async function listCalls(): Promise<readonly CallReceipt[]> {
  if (USE_FIXTURES) return fixtureApi.listCalls();
  const body = await request(API_ROUTES.calls);
  if (!isRecord(body) || !Array.isArray(body.calls)) {
    throw new ApiError(502, "Malformed response from /api/calls");
  }
  return body.calls as CallReceipt[];
}
