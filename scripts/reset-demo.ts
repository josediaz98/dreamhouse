/**
 * Resets demo state for the ingested lots only. Never truncates a table.
 *   scripts/reset-demo.ts           prints what it would delete
 *   scripts/reset-demo.ts --apply   deletes it
 * Deletes: questions of the ingested (non-fixture) properties, and calls made by the demo agent ids below.
 * Afterwards run ingest.ts to restore spec_fields and the flood questions.
 */
import { serviceClient } from "../src/lib/server/repo-supabase";

const DEMO_AGENT_IDS = ["buyer-agent", "mcp-client", "demo-e2e"] as const;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = serviceClient();

  const props = await db.from("properties").select("id").eq("is_fixture", false);
  if (props.error) throw new Error(`properties: ${props.error.message}`);
  const ids = (props.data ?? []).map((p: { id: string }) => p.id);
  if (ids.length === 0) throw new Error("no ingested properties; refusing to run");

  const q = await db.from("questions").select("id", { count: "exact", head: true }).in("property_id", ids);
  const c = await db.from("calls").select("id", { count: "exact", head: true }).in("agent_id", [...DEMO_AGENT_IDS]);
  if (q.error || c.error) throw new Error(`count: ${q.error?.message ?? c.error?.message}`);
  const all = await db.from("calls").select("id", { count: "exact", head: true });
  console.log(`questions on ${ids.length} demo lots: ${q.count ?? 0}`);
  console.log(`calls by ${DEMO_AGENT_IDS.join(", ")}: ${c.count ?? 0} (of ${all.count ?? 0} total; the rest stay)`);
  if (!apply) {
    console.log("dry run; pass --apply to delete");
    return;
  }
  const dq = await db.from("questions").delete().in("property_id", ids);
  const dc = await db.from("calls").delete().in("agent_id", [...DEMO_AGENT_IDS]);
  if (dq.error || dc.error) throw new Error(`delete: ${dq.error?.message ?? dc.error?.message}`);
  console.log("deleted");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
