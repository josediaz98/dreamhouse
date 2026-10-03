/**
 * One command between recordings: pnpm demo:reset
 * Scoped reset (questions of the ingested demo lots + calls by the demo agent ids) and re-ingest.
 * Touches no other rows or tables. Prints question / seller-answer counts before and after.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { serviceClient } from "../src/lib/server/repo-supabase";

const HERE = import.meta.dirname;

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

async function main(): Promise<void> {
  console.log(`before: ${await counts()}`);
  run("reset-demo.ts", ["--apply"]);
  run("ingest.ts", []);
  console.log(`after:  ${await counts()}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
