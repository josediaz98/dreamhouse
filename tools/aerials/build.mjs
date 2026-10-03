// Builds the Lotline aerials from real public imagery.
//   node tools/aerials/build.mjs
// Writes public/aerials/<propertyId>.jpg, public/aerials/hero.jpg and src/lib/aerials.ts
// (generated; do not edit by hand).
// Imagery: USDA NAIP via the USGS National Map ImageServer (public domain).
// Outlines: Sonoma County CDR_Parcels (planning purposes only, not parcel-specific decisions).
import { execFileSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "public/aerials");
const GIS =
  "https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/CDR_Parcels/FeatureServer/0/query";
const NAIP =
  "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage";
const CREDIT = "Aerial: USDA NAIP via USGS (public domain)";

/** Same 6 lots as tools/parcel-map/build.mjs. apn null = the ingest could not resolve the parcel. */
const LOTS = [
  { id: "cb24261a-6334-4000-81ee-f99fb9df163c", label: "35411 Fly Cloud Rd", apn: "155-260-015" },
  { id: "9d1adcd4-e664-4d4b-aa2d-d8328072c61f", label: "35604 Timber Ridge Rd", apn: "155-260-003" },
  { id: "a5ddf92f-dcb2-4e8e-a48f-eeb1d04ce646", label: "35995 Highway 1", apn: "122-190-031" },
  { id: "3b12d583-4e71-4864-b949-fd384cd9897b", label: "39463 Leeward Rd", apn: "156-270-012" },
  { id: "5955e813-1918-401e-867e-4d46c8ad5e61", label: "74 Burl Tree", apn: null },
  { id: "ffe90278-3d7d-4306-a261-274165e3faf3", label: "38065 Foothill Close", apn: null },
];

const LOT_W = 1200;
const LOT_H = 800;
const LOT_MAX_KB = 250;
/** Parcel bbox grows by 40% of its span on each side; never narrower than this (keeps NAIP sharp). */
const MARGIN = 0.4;
const MIN_SPAN_M = 150;

/** The Sea Ranch coastline: ocean, bluff and meadow. Web Mercator centre + width in metres. */
const HERO = { lon: -123.4405, lat: 38.699, widthM: 2400, w: 2400, h: 1350, maxKb: 450 };

const R = 6378137;
const toMerc = ([lon, lat]) => [
  (R * lon * Math.PI) / 180,
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];

async function exportNaip(bbox, w, h, file, maxKb) {
  const url = new URL(NAIP);
  url.searchParams.set("bbox", bbox.join(","));
  url.searchParams.set("bboxSR", "3857");
  url.searchParams.set("imageSR", "3857");
  url.searchParams.set("size", `${w},${h}`);
  url.searchParams.set("format", "jpg");
  url.searchParams.set("f", "json");
  let meta;
  let res;
  // The ImageServer returns an occasional 502 on large exports; retry a few times.
  for (let attempt = 1; ; attempt++) {
    meta = await (await fetch(url)).json();
    if (meta.href && meta.extent) {
      res = await fetch(meta.href);
      if (res.ok) break;
    }
    if (attempt >= 4) throw new Error(`NAIP export failed: ${JSON.stringify(meta).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  const raw = `${file}.raw.jpg`;
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // Re-encode to the size budget (sips ships with macOS).
  for (const q of [72, 64, 56, 48, 40, 32, 26, 20]) {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(q), raw, "--out", file], { stdio: "ignore" });
    if (statSync(file).size <= maxKb * 1024) break;
  }
  execFileSync("rm", [raw]);
  const kb = statSync(file).size / 1024;
  if (kb > maxKb) throw new Error(`${file} is ${kb.toFixed(0)} KB > ${maxKb} KB`);
  const e = meta.extent;
  return { extent: [e.xmin, e.ymin, e.xmax, e.ymax], kb, width: meta.width ?? w, height: meta.height ?? h };
}

// ---- Parcels ----------------------------------------------------------------------------
const apns = LOTS.filter((l) => l.apn).map((l) => `'${l.apn}'`).join(",");
const q = new URL(GIS);
q.searchParams.set("where", `APN IN (${apns})`);
q.searchParams.set("outFields", "APN");
q.searchParams.set("returnGeometry", "true");
q.searchParams.set("outSR", "4326");
q.searchParams.set("f", "geojson");
const gres = await fetch(q);
if (!gres.ok) throw new Error(`GIS ${gres.status}`);
const gj = await gres.json();
const byApn = new Map((gj.features ?? []).map((f) => [f.properties.APN, f]));

const entries = [];
for (const lot of LOTS) {
  if (!lot.apn) {
    entries.push({ propertyId: lot.id, src: null, width: LOT_W, height: LOT_H, outline: null, credit: CREDIT });
    continue;
  }
  const f = byApn.get(lot.apn);
  if (!f) throw new Error(`parcel ${lot.apn} not returned`);
  const geom = f.geometry;
  const ring = geom.type === "MultiPolygon" ? geom.coordinates[0][0] : geom.coordinates[0];
  const pts = ring.map(toMerc);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let w = (Math.max(...xs) - Math.min(...xs)) * (1 + 2 * MARGIN);
  let h = (Math.max(...ys) - Math.min(...ys)) * (1 + 2 * MARGIN);
  w = Math.max(w, h * 1.5, MIN_SPAN_M);
  h = w / 1.5;
  const bbox = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  const file = join(OUT, `${lot.id}.jpg`);
  const img = await exportNaip(bbox, LOT_W, LOT_H, file, LOT_MAX_KB);
  const [x0, y0, x1, y1] = img.extent;
  const outline = pts.map(([x, y]) => [
    Number((((x - x0) / (x1 - x0)) * LOT_W).toFixed(1)),
    Number((((y1 - y) / (y1 - y0)) * LOT_H).toFixed(1)),
  ]);
  entries.push({ propertyId: lot.id, src: `/aerials/${lot.id}.jpg`, width: LOT_W, height: LOT_H, outline, credit: CREDIT });
  console.log(`${lot.label}: ${img.kb.toFixed(0)} KB, span ${w.toFixed(0)} m`);
}

// ---- Hero -------------------------------------------------------------------------------
const [hx, hy] = toMerc([HERO.lon, HERO.lat]);
const hh = (HERO.widthM * HERO.h) / HERO.w;
const hero = await exportNaip(
  [hx - HERO.widthM / 2, hy - hh / 2, hx + HERO.widthM / 2, hy + hh / 2],
  HERO.w,
  HERO.h,
  join(OUT, "hero.jpg"),
  HERO.maxKb,
);
console.log(`hero: ${hero.kb.toFixed(0)} KB`);

const ts = `// Generated by tools/aerials/build.mjs. Do not edit by hand.
// Imagery: USDA NAIP via USGS (public domain). Outlines: Sonoma County CDR_Parcels, projected
// into image pixels (Web Mercator, y down). Planning purposes only, not parcel-specific decisions.

export const AERIAL_CREDIT = ${JSON.stringify(CREDIT)} as const;

export interface LotAerial {
  readonly propertyId: string;
  /** Null when the parcel is unresolved: no photo is shown. */
  readonly src: string | null;
  readonly width: number;
  readonly height: number;
  /** Parcel outline in image pixels [x, y], y down. Null when the parcel is unresolved. */
  readonly outline: readonly (readonly [number, number])[] | null;
  readonly credit: typeof AERIAL_CREDIT;
}

export interface HeroAerial {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly credit: typeof AERIAL_CREDIT;
}

export const LOT_AERIALS: readonly LotAerial[] = ${JSON.stringify(entries, null, 2)};

export const HERO_AERIAL: HeroAerial = ${JSON.stringify(
  { src: "/aerials/hero.jpg", width: HERO.w, height: HERO.h, credit: CREDIT },
  null,
  2,
)};

const BY_ID: ReadonlyMap<string, LotAerial> = new Map(LOT_AERIALS.map((a) => [a.propertyId, a]));

export function aerialFor(propertyId: string): LotAerial | undefined {
  return BY_ID.get(propertyId);
}
`;
writeFileSync(join(ROOT, "src/lib/aerials.ts"), ts);
console.log("wrote src/lib/aerials.ts");
