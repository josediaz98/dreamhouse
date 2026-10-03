/**
 * Live change feed. Real mode: Supabase `postgres_changes` on spec_fields and questions
 * (INSERT, UPDATE). Fixture mode: the fixture store notifies same-tab and cross-tab.
 * Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in real mode.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TABLES } from "@/lib/contract";
import { USE_FIXTURES } from "@/lib/client/api";
import { subscribeFixtureChanges } from "@/lib/client/fixture-store";
import type { ChangeHandler } from "@/lib/client/types";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey);
  return client;
}

function readPropertyId(row: unknown): string | null {
  if (typeof row !== "object" || row === null) return null;
  const value = (row as Record<string, unknown>).property_id;
  return typeof value === "string" ? value : null;
}

export function subscribeToChanges(onChange: ChangeHandler): () => void {
  if (USE_FIXTURES) return subscribeFixtureChanges(onChange);

  const supabase = getClient();
  if (!supabase) {
    console.warn("Realtime disabled: Supabase public env vars are not set.");
    return () => undefined;
  }

  const channel = supabase.channel("dreamhouse-live");
  for (const table of [TABLES.specFields, TABLES.questions]) {
    for (const event of ["INSERT", "UPDATE"] as const) {
      channel.on("postgres_changes", { event, schema: "public", table }, (payload) => {
        onChange({
          table,
          propertyId: readPropertyId(payload.new),
        });
      });
    }
  }
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
