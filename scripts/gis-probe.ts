// Tracer bullet, no database: APN -> Sonoma parcel -> FEMA + coastal -> spec fields. Run: pnpm exec tsx scripts/gis-probe.ts 156-100-021
import { gisSpecFields, parcelByApn } from "../src/lib/server/gis";

async function main(): Promise<void> {
  const apn = process.argv[2] ?? "156-100-021";
  const parcel = await parcelByApn(apn);
  if (!parcel) throw new Error(`No parcel for APN ${apn}`);
  console.log(JSON.stringify(parcel));
  for (const f of await gisSpecFields("probe", parcel)) console.log(f.key, "=", JSON.stringify(f.value), `[${f.status}]`, f.note ?? "");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
