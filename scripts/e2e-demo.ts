/**
 * The three demo outcomes on stored data, over HTTP. Mutates the DB: afterwards run
 *   reset-demo.ts --apply && ingest.ts
 *   pnpm exec tsx --env-file=.env.local scripts/e2e-demo.ts http://localhost:3111
 */
import type { BuildabilityResult, Question, SearchPropertiesOutput, SpecFieldKey } from "../src/lib/contract";

const base = process.argv[2] ?? "http://localhost:3111";
const program = { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 };

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-agent-id": "demo-e2e" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const verdicts = (r: BuildabilityResult) => `${r.overall} [${r.checks.map((c) => `${c.rule}:${c.verdict}`).join(" ")}]`;

async function main(): Promise<void> {
  const { items } = await call<SearchPropertiesOutput>("/api/tools/search_properties", { program });
  const id = (needle: string) => {
    const p = items.find((i) => i.property.address.includes(needle))?.property;
    if (!p) throw new Error(`no lot ${needle}`);
    return p.id;
  };
  const check = (propertyId: string) => call<BuildabilityResult>("/api/tools/check_buildability", { propertyId, program });
  const ensure = async (propertyId: string, fieldKey: SpecFieldKey, text: string) =>
    (await call<{ question: Question }>("/api/tools/ask_seller", { propertyId, fieldKey, text })).question;
  const answer = (q: Question, text: string) => call<{ question: Question }>(`/api/questions/${q.id}/answer`, { answer: text });

  const lots = { leeward: id("Leeward"), burl: id("Burl Tree"), timber: id("Timber Ridge") };
  console.log("lot ids", JSON.stringify(lots));

  console.log("\nA. fails on height after the seller answers (Leeward, west of Hwy 1)");
  console.log("  before:", verdicts(await check(lots.leeward)));
  const qa = await ensure(lots.leeward, "tract_map_height_cap_ft", "Does the recorded tract map cap the height at 16 ft for this lot?");
  await answer(qa, "The tract map says 16 ft");
  console.log("  after: ", verdicts(await check(lots.leeward)));

  console.log("\nB. unknown -> two seller answers -> pass (Burl Tree)");
  console.log("  before:", verdicts(await check(lots.burl)));
  const qb1 = await ensure(lots.burl, "tract_map_height_cap_ft", "Does the recorded tract map cap the height at 16 ft for this lot?");
  await answer(qb1, "No cap on the tract map");
  console.log("  after 1 answer:", verdicts(await check(lots.burl)));
  const flood = (await call<{ questions: Question[] }>("/api/questions?status=open")).questions.find((q) => q.propertyId === lots.burl && q.fieldKey === "flood_zone");
  if (!flood) throw new Error("no open flood question on Burl Tree");
  await answer(flood, "Outside the special flood hazard area");
  console.log("  after 2 answers:", verdicts(await check(lots.burl)));

  console.log("\nC. stays unknown with open questions (Timber Ridge)");
  const c = await check(lots.timber);
  console.log("  now:   ", verdicts(c), `| open questions: ${c.openQuestionIds.length}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
