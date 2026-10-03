import { geocodeAddress } from "../src/lib/server/geocode";
import { resolveParcel } from "../src/lib/server/gis";

const LOTS: readonly [string, readonly number[]][] = [
  ["38065 Foothill Close", [1, 0.5]],
  ["35411 Fly Cloud Road", [1, 0.5]],
  ["35995 Highway 1", [2.23]],
  ["74 Burl Tree", [0.5]],
  ["35604 Timber Ridge Road", [0.46]],
  ["39463 Leeward Road", [0.39]],
];

async function main(): Promise<void> {
  for (const [a, hints] of LOTS) {
    const g = await geocodeAddress(`${a}, The Sea Ranch, CA 95497`);
    const r = g ? await resolveParcel(g.lon, g.lat, hints) : null;
    console.log(a, "->", r?.parcel ? `${r.parcel.apn} ${r.parcel.acres?.toFixed(2)} ac` : "APN unknown", "|", r?.note ?? "no geocode");
  }
}
main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
