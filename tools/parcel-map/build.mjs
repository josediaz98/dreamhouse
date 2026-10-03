// Builds the Lotline parcel sheet from real county GIS geometry.
//   node tools/parcel-map/build.mjs
// Writes public/brand/parcels.svg and src/lib/parcel-shapes.ts (generated; do not edit by hand).
// Source: Sonoma County CDR_Parcels (planning purposes only, not parcel-specific decisions).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GIS =
  "https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/CDR_Parcels/FeatureServer/0/query";

/** The 6 ingested demo lots. apn null = the ingest could not resolve the parcel. */
const LOTS = [
  { id: "cb24261a-6334-4000-81ee-f99fb9df163c", label: "35411 Fly Cloud Rd", apn: "155-260-015" },
  { id: "9d1adcd4-e664-4d4b-aa2d-d8328072c61f", label: "35604 Timber Ridge Rd", apn: "155-260-003" },
  { id: "a5ddf92f-dcb2-4e8e-a48f-eeb1d04ce646", label: "35995 Highway 1", apn: "122-190-031" },
  { id: "3b12d583-4e71-4864-b949-fd384cd9897b", label: "39463 Leeward Rd", apn: "156-270-012" },
  { id: "5955e813-1918-401e-867e-4d46c8ad5e61", label: "74 Burl Tree", apn: null },
  { id: "ffe90278-3d7d-4306-a261-274165e3faf3", label: "38065 Foothill Close", apn: null },
];

const C = {
  bg: "#0d0f0e",
  surface: "#131614",
  line: "#2a302c",
  lineStrong: "#3b423d",
  fg: "#ecebe4",
  muted: "#a3aaa2",
  accent: "#d8a24a",
};
const MONO = "ui-monospace, 'IBM Plex Mono', Menlo, monospace";
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";

const apns = LOTS.filter((l) => l.apn).map((l) => `'${l.apn}'`).join(",");
const url = new URL(GIS);
url.searchParams.set("where", `APN IN (${apns})`);
url.searchParams.set("outFields", "APN,ACREAGE");
url.searchParams.set("returnGeometry", "true");
url.searchParams.set("outSR", "4326");
url.searchParams.set("f", "geojson");
const res = await fetch(url);
if (!res.ok) throw new Error(`GIS ${res.status}`);
const gj = await res.json();
if (!Array.isArray(gj.features) || gj.features.length === 0) throw new Error("no parcel features returned");

const FT_PER_M = 3.28084;
const byApn = new Map(gj.features.map((f) => [f.properties.APN, f]));

/** Polygon in local feet, north up, centred on its bbox. */
function toFeet(feature) {
  const ring = feature.geometry.coordinates[0];
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const lon0 = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const pts = ring.map(([lon, lat]) => [
    (lon - lon0) * Math.cos((lat0 * Math.PI) / 180) * 111320 * FT_PER_M,
    -(lat - lat0) * 110540 * FT_PER_M,
  ]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(([x, y]) => [x - cx, y - cy]);
}

const shapes = LOTS.map((l) => {
  const f = l.apn ? byApn.get(l.apn) : undefined;
  if (l.apn && !f) throw new Error(`parcel ${l.apn} not returned`);
  return { ...l, acres: f ? Number(f.properties.ACREAGE) : null, ft: f ? toFeet(f) : null };
});

// One scale for every parcel so sizes are honest.
const CELL_W = 460;
const CELL_H = 300;
const PAD = 40;
const maxW = Math.max(...shapes.filter((s) => s.ft).map((s) => Math.max(...s.ft.map((p) => Math.abs(p[0]))) * 2));
const maxH = Math.max(...shapes.filter((s) => s.ft).map((s) => Math.max(...s.ft.map((p) => Math.abs(p[1]))) * 2));
const pxPerFt = Math.min((CELL_W - PAD * 2) / maxW, (CELL_H - PAD * 2 - 30) / maxH);

const W = 1600;
const H = 1000;
const COLS = 3;
const GX = (W - COLS * CELL_W) / (COLS + 1);
const TOP = 170;
const GY = 60;

let body = "";
shapes.forEach((s, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x0 = GX + col * (CELL_W + GX);
  const y0 = TOP + row * (CELL_H + GY);
  const cx = x0 + CELL_W / 2;
  const cy = y0 + (CELL_H - 30) / 2;
  body += `<g>\n<rect x="${x0}" y="${y0}" width="${CELL_W}" height="${CELL_H}" fill="${C.surface}" stroke="${C.line}"/>\n`;
  if (s.ft) {
    const d = s.ft.map(([x, y], k) => `${k ? "L" : "M"}${(cx + x * pxPerFt).toFixed(1)} ${(cy + y * pxPerFt).toFixed(1)}`).join("") + "Z";
    body += `<path d="${d}" fill="${C.fg}" fill-opacity="0.06" stroke="${C.fg}" stroke-width="1.6" stroke-linejoin="round"/>\n`;
    body += `<text x="${x0 + 14}" y="${y0 + CELL_H - 30}" font-family="${MONO}" font-size="12" fill="${C.muted}">APN ${s.apn} · ${s.acres.toFixed(2)} ac</text>\n`;
  } else {
    const w = 170;
    const h = 110;
    body += `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-dasharray="7 6"/>\n`;
    body += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${SERIF}" font-size="30" fill="${C.accent}">?</text>\n`;
    body += `<text x="${x0 + 14}" y="${y0 + CELL_H - 30}" font-family="${MONO}" font-size="12" fill="${C.muted}">parcel not resolved · not to scale</text>\n`;
  }
  body += `<text x="${x0 + 14}" y="${y0 + CELL_H - 12}" font-family="${MONO}" font-size="13" fill="${C.fg}">${s.label}</text>\n</g>\n`;
});

// Scale bar (200 ft) and north arrow, bottom right.
const barPx = 200 * pxPerFt;
const bx = W - 80 - barPx;
const by = H - 62;
const chrome = `
<g font-family="${MONO}" font-size="12" fill="${C.muted}">
  <line x1="${bx}" y1="${by}" x2="${bx + barPx}" y2="${by}" stroke="${C.fg}" stroke-width="2"/>
  <line x1="${bx}" y1="${by - 5}" x2="${bx}" y2="${by + 5}" stroke="${C.fg}"/>
  <line x1="${bx + barPx}" y1="${by - 5}" x2="${bx + barPx}" y2="${by + 5}" stroke="${C.fg}"/>
  <text x="${bx}" y="${by + 22}">0</text><text x="${bx + barPx}" y="${by + 22}" text-anchor="end">200 ft</text>
  <path d="M${W - 54} ${by - 34} L${W - 46} ${by - 8} L${W - 54} ${by - 14} L${W - 62} ${by - 8} Z" fill="${C.fg}"/>
  <text x="${W - 54}" y="${by - 40}" text-anchor="middle" fill="${C.fg}">N</text>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Parcel outlines of the demo lots at one common scale. Two lots have no resolved parcel and are drawn dashed.">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<g font-family="${MONO}" font-size="12" fill="${C.muted}" letter-spacing="1.5"><text x="${GX}" y="64">PARCEL SHEET · THE SEA RANCH, CA</text></g>
<text x="${GX}" y="122" font-family="${SERIF}" font-size="46" fill="${C.fg}">Where the facts stop, the line is dashed.</text>
${body}${chrome}
<text x="${GX}" y="${H - 28}" font-family="${MONO}" font-size="11" fill="${C.muted}">Outlines: Sonoma County CDR_Parcels, drawn at one common scale. Planning purposes only, not parcel-specific decisions. Dashed = parcel not resolved.</text>
</svg>
`;

writeFileSync(join(ROOT, "public/brand/parcels.svg"), svg);

const ts = `// Generated by tools/parcel-map/build.mjs. Do not edit by hand.
// Parcel outlines in feet, north up, centred on each parcel. Source: Sonoma County CDR_Parcels
// (planning purposes only, not parcel-specific decisions). A null outline = parcel not resolved.

export interface ParcelShape {
  readonly propertyId: string;
  readonly label: string;
  readonly apn: string | null;
  readonly acres: number | null;
  /** [x, y] in feet, y grows southward (screen orientation). Null when the parcel is unresolved. */
  readonly outline: readonly (readonly [number, number])[] | null;
}

export const PARCEL_SHAPES: readonly ParcelShape[] = ${JSON.stringify(
  shapes.map((s) => ({
    propertyId: s.id,
    label: s.label,
    apn: s.apn,
    acres: s.acres,
    outline: s.ft ? s.ft.map(([x, y]) => [Number(x.toFixed(1)), Number(y.toFixed(1))]) : null,
  })),
  null,
  2,
)};
`;
writeFileSync(join(ROOT, "src/lib/parcel-shapes.ts"), ts);
console.log(`wrote parcels.svg (${(svg.length / 1024).toFixed(1)} KB) and parcel-shapes.ts; scale ${pxPerFt.toFixed(3)} px/ft`);
