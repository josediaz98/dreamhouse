/**
 * One command between recordings, and a gate right before one: pnpm demo:reset
 * Scoped reset (questions of the ingested demo lots + calls by the demo agent ids) and re-ingest.
 * Touches no other rows or tables. Prints counts before and after and per lot, then checks the final
 * state against the clean demo state and exits 1 if anything differs (for example another session
 * answered a question in the meantime).
 * `--check` skips the reset and only verifies (use it as the last gate before recording).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { checkBuildability } from "../src/lib/server/buildability";
import { DEMO_PROGRAM } from "../src/lib/server/demo";
import { serviceClient, supabaseRepo } from "../src/lib/server/repo-supabase";

const HERE = import.meta.dirname;
/** The clean demo state at DEMO_PROGRAM: 2 lots eliminated on stored facts, 4 unknown with their 3 seller questions open. */
const EXPECTED = { failing: 2, unknown: 4, openPerUnknownLot: ["flood_zone", "septic_status", "water_status"] } as const;

async function counts(): Promise<string> {
  const db = serviceClient();
  const count = async (build: (t: ReturnType<typeof db.from>) => PromiseLike<{ count: number | null; error: { message: string } | null }>, table: string) => {
    const r = await build(db.from(table));
    if (r.error) throw new Error(`${table}: ${r.error.message}`);
    return r.count ?? 0;
  };
  const open = await count((t) => t.select("id", { count: "exact", head: true }).eq("status", "open"), "questions");
  const answered = await count((t) => t.select("id", { count: "exact", head: true }).eq("status", "answered"), "questions");
  const seller = await count((t) => t.select("property_id", { count: "exact", head: true }).eq("source_type", "seller"), "spec_fields");
  return `questions open=${open} answered=${answered} | spec_fields from seller=${seller}`;
}

function run(script: string, args: readonly string[]): void {
  const r = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", path.join(HERE, script), ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${script} failed (exit ${r.status})`);
}

/** Prints per-lot counts and returns the list of differences from the clean state (empty = clean). */
async function verify(): Promise<string[]> {
  const repo = supabaseRepo();
  const [props, byProperty, rules, questions] = await Promise.all([repo.listProperties(), repo.allFields(), repo.rules(), repo.listQuestions({})]);
  const lots = props.filter((p) => !p.isFixture);
  const problems: string[] = [];
  let failing = 0;
  let unknown = 0;
  console.log(`\nper lot at ${DEMO_PROGRAM.heightFt} ft:`);
  for (const lot of lots) {
    const fields = byProperty.get(lot.id) ?? [];
    const overall = checkBuildability(lot.id, fields, rules, DEMO_PROGRAM, questions).overall;
    const mine = questions.filter((q) => q.propertyId === lot.id);
    const open = mine.filter((q) => q.status === "open");
    const answered = mine.filter((q) => q.status === "answered");
    const sellerFields = fields.filter((f) => f.source?.type === "seller").length;
    console.log(`  ${lot.address.split(",")[0]?.padEnd(24)} ${overall.padEnd(8)} open=${open.length} answered=${answered.length} seller_fields=${sellerFields}`);
    if (overall === "fail") {
      failing++;
      if (open.length > 0) problems.push(`${lot.address}: failing lot has ${open.length} open questions`);
    } else if (overall === "unknown") {
      unknown++;
      const keys = open.map((q) => q.fieldKey).sort();
      if (keys.join() !== [...EXPECTED.openPerUnknownLot].join()) problems.push(`${lot.address}: open questions are [${keys.join(", ")}], expected [${EXPECTED.openPerUnknownLot.join(", ")}]`);
    } else {
      problems.push(`${lot.address}: overall is pass, expected fail or unknown`);
    }
    if (answered.length > 0) problems.push(`${lot.address}: ${answered.length} answered questions`);
    if (sellerFields > 0) problems.push(`${lot.address}: ${sellerFields} fields from seller answers`);
  }
  if (failing !== EXPECTED.failing) problems.push(`eliminated lots: ${failing}, expected ${EXPECTED.failing}`);
  if (unknown !== EXPECTED.unknown) problems.push(`unknown lots: ${unknown}, expected ${EXPECTED.unknown}`);
  return problems;
}

async function main(): Promise<void> {
  if (process.argv.includes("--check")) console.log(`state:  ${await counts()}`);
  else {
    console.log(`before: ${await counts()}`);
    run("reset-demo.ts", ["--apply"]);
    run("ingest.ts", []);
    console.log(`after:  ${await counts()}`);
  }
  const problems = await verify();
  if (problems.length > 0) {
    console.error(`\nNOT CLEAN (${problems.length}):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("\nCLEAN: ready to record");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
