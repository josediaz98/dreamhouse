/**
 * DoD check: a seller answer flips a verdict and the change arrives over Realtime (anon key).
 *   pnpm exec tsx --env-file=.env.local scripts/e2e-seller.ts http://localhost:3111 [address-substring]
 * Leaves the lot answered: re-run scripts/ingest.ts afterwards to reset spec_fields.
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import type { BuildabilityResult, Question, SearchPropertiesOutput } from "../src/lib/contract";

const base = process.argv[2] ?? "http://localhost:3111";
const needle = process.argv[3] ?? "Leeward";
const program = { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-agent-id": "demo-e2e" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("missing Supabase env");
  const search = await post<SearchPropertiesOutput>("/api/tools/search_properties", { program });
  const lot = search.items.find((i) => i.property.address.includes(needle));
  if (!lot) throw new Error(`no lot matching ${needle}`);
  const id = lot.property.id;

  const events: string[] = [];
  const sb = createClient(url, anon, { realtime: { transport: ws as never } });
  const channel = sb
    .channel("e2e")
    .on("postgres_changes", { event: "*", schema: "public", table: "spec_fields" }, (p) => events.push(`spec_fields ${p.eventType}`))
    .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, (p) => events.push(`questions ${p.eventType}`));
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(`realtime ${status}`));
    });
  });

  const before = await post<BuildabilityResult>("/api/tools/check_buildability", { propertyId: id, program });
  const { question } = await post<{ question: Question }>("/api/tools/ask_seller", {
    propertyId: id,
    fieldKey: "tract_map_height_cap_ft",
    text: "Does the recorded tract map cap the height at 16 ft for this lot?",
  });
  const linked = (await post<BuildabilityResult>("/api/tools/check_buildability", { propertyId: id, program })).checks.find((c) => c.rule === "height");
  events.length = 0;
  const answered = await post<{ question: Question }>(`/api/questions/${question.id}/answer`, { answer: "The tract map says 16 ft" });
  await new Promise((r) => setTimeout(r, 3000));
  const after = await post<BuildabilityResult>("/api/tools/check_buildability", { propertyId: id, program });
  await sb.removeAllChannels();

  const h = (r: BuildabilityResult) => r.checks.find((c) => c.rule === "height")?.verdict;
  console.log(`lot ${lot.property.address}`);
  console.log(`height before=${h(before)} overall=${before.overall} | question linked on check=${linked?.questionId === question.id}`);
  console.log(`answer status=${answered.question.status}`);
  console.log(`height after=${h(after)} overall=${after.overall}`);
  console.log(`realtime events after answer: ${JSON.stringify(events)}`);
  if (h(before) !== "unknown" || h(after) !== "fail" || events.length === 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
