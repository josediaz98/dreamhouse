/**
 * Ingest the hand-made listing snapshots into Supabase.
 *   pnpm exec tsx --env-file=.env.local scripts/ingest.ts
 * For each snapshots/*.txt: facts come from <name>.facts.json when present (offline extraction cache),
 * otherwise from Claude (needs ANTHROPIC_API_KEY). Evidence is verified either way.
 * `--extract` ignores the cache and calls Claude for every snapshot (needs ANTHROPIC_API_KEY); with `--write-cache` the
 * validated facts replace <name>.facts.json.
 * `--dry` writes to an in-memory repo instead and prints the verdict for the demo program.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { geocodeAddress } from "../src/lib/server/geocode";
import { gisSpecFields, hwy1SideField, resolveParcel, type Parcel } from "../src/lib/server/gis";
import { buildSpecFields, claudeExtractor, EXTRACTION_MODEL, FactsSchema, parseSnapshot, validateFacts, type ExtractedFact } from "../src/lib/server/ingest";
import { memoryRepo } from "../src/lib/server/repo-memory";
import { supabaseRepo } from "../src/lib/server/repo-supabase";
import { SEA_RANCH_RULES } from "../src/lib/server/rules";
import { runTool } from "../src/lib/server/tools";

const DIR = path.join(import.meta.dirname, "snapshots");

async function cachedFacts(name: string): Promise<readonly ExtractedFact[] | null> {
  try {
    return FactsSchema.parse(JSON.parse(await readFile(path.join(DIR, `${name}.facts.json`), "utf8"))).facts;
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "ENOENT") return null;
    throw e;
  }
}

async function factsFor(name: string, snap: ReturnType<typeof parseSnapshot>): Promise<readonly ExtractedFact[]> {
  const forceExtract = process.argv.includes("--extract");
  const cached = forceExtract ? null : await cachedFacts(name);
  if (cached) return cached;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error(`${name}: no cached facts and ANTHROPIC_API_KEY is not set`);
  const facts = await claudeExtractor()(snap);
  if (process.argv.includes("--write-cache")) {
    const { kept } = validateFacts(snap, facts);
    await writeFile(path.join(DIR, `${name}.facts.json`), `${JSON.stringify({ extractedBy: `${EXTRACTION_MODEL} via scripts/ingest.ts --extract; evidence verified against the snapshot`, facts: kept }, null, 2)}\n`);
  }
  return facts;
}

async function geocodeWithRetry(address: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const hit = await geocodeAddress(address).catch(() => null);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  return null;
}

async function main(): Promise<void> {
  const dry = process.argv.includes("--dry");
  const repo = dry ? memoryRepo({ rules: [...SEA_RANCH_RULES] }) : supabaseRepo();
  const names = (await readdir(DIR)).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, ""));
  for (const name of names) {
    const snap = parseSnapshot(await readFile(path.join(DIR, `${name}.txt`), "utf8"));
    const { kept, rejected } = validateFacts(snap, await factsFor(name, snap));
    for (const r of rejected) console.warn(`  rejected ${r.fact.key}: ${r.why}`);

    const hints = kept.filter((f) => f.key === "acres" && typeof f.value === "number").map((f) => f.value as number);
    const geo = await geocodeWithRetry(snap.address);
    const res = geo && hints.length > 0 ? await resolveParcel(geo.lon, geo.lat, hints) : { parcel: null, candidates: [], note: "address did not geocode or no acreage in the listing" };
    const parcel: Parcel | null = res.parcel;

    const price = kept.find((f) => f.key === "price_usd")?.value;
    const placeholder = await repo.upsertProperty({
      apn: parcel?.apn ?? null,
      address: snap.address,
      sourceUrl: snap.url,
      priceUsd: typeof price === "number" ? price : null,
      acres: null,
      snapshotAt: snap.capturedAt,
      isFixture: false,
    });
    const gis = parcel ? await gisSpecFields(placeholder.id, parcel) : geo ? [await hwy1SideField(placeholder.id, geo.lon, geo.lat, "the street-interpolated geocode point")] : [];
    const fields = buildSpecFields(placeholder.id, snap, kept, res, gis);
    await repo.replaceFields(placeholder.id, fields);
    const acres = fields.find((f) => f.key === "acres");
    await repo.upsertProperty({ ...placeholder, acres: acres?.status === "known" && typeof acres.value === "number" ? acres.value : null });

    const unknown = fields.filter((f) => f.status !== "known").length;
    console.log(`${snap.address}: apn=${parcel?.apn ?? "unknown"} known=${fields.length - unknown}/${fields.length} (${res.note})`);
  }
  if (dry) {
    const out = await runTool(repo, "search_properties", { program: { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 } });
    for (const i of out.items) {
      const r = await runTool(repo, "check_buildability", { propertyId: i.property.id, program: { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 } });
      console.log(i.property.address.padEnd(48), r.overall.padEnd(8), r.checks.map((c) => `${c.rule}:${c.verdict}`).join(" "));
    }
    console.log(`eliminatedCount=${out.eliminatedCount}`);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
