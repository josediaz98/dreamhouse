/**
 * The three demo outcomes on stored data, over HTTP. Mutates the DB: afterwards run
 *   reset-demo.ts --apply && ingest.ts
 *   pnpm exec tsx --env-file=.env.local scripts/e2e-demo.ts http://localhost:3111
 */
import type { BuildabilityResult, Question, SearchPropertiesOutput } from "../src/lib/contract";
import { DEMO_PROGRAM as program } from "../src/lib/server/demo";

const base = process.argv[2] ?? "http://localhost:3111";

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
  const search = await call<SearchPropertiesOutput>("/api/tools/search_properties", { program });
  console.log(`program ${program.heightFt} ft: ${search.items.length} lots, eliminatedCount=${search.eliminatedCount}`);
  const id = (needle: string) => {
    const p = search.items.find((i) => i.property.address.includes(needle))?.property;
    if (!p) throw new Error(`no lot ${needle}`);
    return p.id;
  };
  const check = (propertyId: string) => call<BuildabilityResult>("/api/tools/check_buildability", { propertyId, program });
  const lots = { leeward: id("Leeward"), timber: id("Timber Ridge"), hwy1: id("Highway 1") };
  console.log("lot ids", JSON.stringify(lots));

  console.log("\nA. fails from stored facts (Leeward, west of Hwy 1, limit 24 ft)");
  console.log("  stored:", verdicts(await check(lots.leeward)));

  console.log("\nB. Timber Ridge (east of Hwy 1, limit 35 ft): unknown -> three seller answers -> pass");
  console.log("  stored:", verdicts(await check(lots.timber)));
  const open = (await call<{ questions: Question[] }>("/api/questions?status=open")).questions.filter((q) => q.propertyId === lots.timber);
  const answers = [
    ["septic_status", "Septic approved for 3 bedrooms"],
    ["water_status", "Connected to the Sea Ranch Water Company"],
    ["flood_zone", "Outside the special flood hazard area"],
  ] as const;
  for (const [fieldKey, text] of answers) {
    const q = open.find((x) => x.fieldKey === fieldKey);
    if (!q) throw new Error(`no open ${fieldKey} question on Timber Ridge`);
    await call(`/api/questions/${q.id}/answer`, { answer: text });
    console.log(`  after ${fieldKey}:`.padEnd(24), verdicts(await check(lots.timber)));
  }

  console.log("\nC. stays unknown with open questions (Highway 1)");
  const c = await check(lots.hwy1);
  console.log("  now:   ", verdicts(c), `| open questions: ${c.openQuestionIds.length}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
