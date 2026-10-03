/** Clears questions and the calls log so a demo or a recording starts clean. Run ingest.ts after to reset spec_fields. */
import { serviceClient } from "../src/lib/server/repo-supabase";

async function main(): Promise<void> {
  const db = serviceClient();
  const NIL = "00000000-0000-0000-0000-000000000000";
  for (const table of ["questions", "calls"] as const) {
    const { error, count } = await db.from(table).delete({ count: "exact" }).neq("id", NIL);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`${table}: removed ${count ?? 0}`);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
