/**
 * Public county / federal GIS lookups. No API keys. Deterministic: values come straight from the layers.
 * Sonoma data carries a "planning purposes only, not parcel-specific decisions" disclaimer.
 */
import type { SourceRef, SpecField } from "@/lib/contract";

const PARCELS_URL = "https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/CDR_Parcels/FeatureServer/0/query";
const COASTAL_URL = "https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/Coastal_Zone_Boundary_DRAFT/FeatureServer/0/query";
const FEMA_URL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";

const PARCEL_SOURCE: SourceRef = {
  type: "gis",
  url: PARCELS_URL,
  page: null,
  label: "Sonoma County parcels (CDR_Parcels; planning purposes only)",
};
const COASTAL_SOURCE: SourceRef = {
  type: "gis",
  url: COASTAL_URL,
  page: null,
  label: "Sonoma Coastal Zone boundary (DRAFT layer)",
};
const FEMA_SOURCE: SourceRef = { type: "gis", url: FEMA_URL, page: null, label: "FEMA NFHL flood zones" };

export interface Parcel {
  readonly apn: string;
  readonly acres: number | null;
  readonly zone: string | null;
  readonly landUse: string | null;
  readonly fireHazard: string | null;
  readonly sanitation: string | null;
  readonly asmtUseCode: string | null;
  readonly lat: number | null;
  readonly lon: number | null;
}

export interface FloodZone {
  readonly zone: string | null;
  readonly sfha: boolean | null;
}

type Attrs = Record<string, unknown>;

async function arcgis(url: string, params: Record<string, string>): Promise<Attrs[]> {
  const qs = new URLSearchParams({ f: "json", returnGeometry: "false", ...params });
  const res = await fetch(`${url}?${qs.toString()}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`GIS ${res.status} for ${new URL(url).hostname}`);
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null) throw new Error("GIS: unexpected response");
  const rec = body as { error?: { message?: string }; features?: { attributes?: Attrs }[] };
  if (rec.error) throw new Error(`GIS error: ${rec.error.message ?? "unknown"}`);
  return (rec.features ?? []).map((f) => f.attributes ?? {});
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function toParcel(a: Attrs): Parcel | null {
  const apn = str(a.APN);
  if (apn === null) return null;
  const ll = str(a.LAT_LONG)?.split(",").map((s) => Number(s.trim()));
  const [lat, lon] = ll && ll.length === 2 && ll.every(Number.isFinite) ? ll : [null, null];
  return {
    apn,
    acres: num(a.ACREAGE),
    zone: str(a.ZONE),
    landUse: str(a.LU),
    fireHazard: str(a.FHSZ),
    sanitation: str(a.SANITATION),
    asmtUseCode: str(a.ASMT_USECODE),
    lat: lat ?? null,
    lon: lon ?? null,
  };
}

const PARCEL_FIELDS = "APN,ACREAGE,ZONE,LU,FHSZ,SANITATION,ASMT_USECODE,LAT_LONG";

export async function parcelByApn(apn: string): Promise<Parcel | null> {
  if (!/^\d{3}-\d{3}-\d{3}$/.test(apn)) throw new Error(`Invalid APN "${apn}" (expected 000-000-000)`);
  const rows = await arcgis(PARCELS_URL, { where: `APN='${apn}'`, outFields: PARCEL_FIELDS });
  return rows[0] ? toParcel(rows[0]) : null;
}

export async function parcelByPoint(lon: number, lat: number): Promise<Parcel | null> {
  const rows = await arcgis(PARCELS_URL, {
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: PARCEL_FIELDS,
  });
  return rows[0] ? toParcel(rows[0]) : null;
}

export async function parcelsNear(lon: number, lat: number, meters: number): Promise<Parcel[]> {
  const rows = await arcgis(PARCELS_URL, {
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(meters),
    units: "esriSRUnit_Meter",
    outFields: PARCEL_FIELDS,
  });
  return rows.map(toParcel).filter((p): p is Parcel => p !== null);
}

export async function floodZoneAt(lon: number, lat: number): Promise<FloodZone | null> {
  const rows = await arcgis(FEMA_URL, {
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "FLD_ZONE,SFHA_TF",
  });
  const a = rows[0];
  if (!a) return null;
  const sfha = str(a.SFHA_TF);
  return { zone: str(a.FLD_ZONE), sfha: sfha === "T" ? true : sfha === "F" ? false : null };
}

export async function inCoastalZone(lon: number, lat: number): Promise<boolean> {
  const rows = await arcgis(COASTAL_URL, {
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    resultRecordCount: "1",
  });
  return rows.length > 0;
}

function f(
  propertyId: string,
  key: SpecField["key"],
  value: SpecField["value"],
  source: SourceRef,
  note: string | null = null,
): SpecField {
  return { propertyId, key, value, status: value === null ? "unknown" : "known", source, confidence: null, note };
}

/** Deterministic spec fields from GIS. Never guesses: a missing layer result is `unknown` with the reason. */
export async function gisSpecFields(propertyId: string, parcel: Parcel): Promise<SpecField[]> {
  const out: SpecField[] = [
    f(propertyId, "acres", parcel.acres, PARCEL_SOURCE, parcel.acres === null ? "Parcel layer has no acreage" : null),
    f(propertyId, "zoning", parcel.zone, PARCEL_SOURCE),
    f(propertyId, "land_use", parcel.landUse, PARCEL_SOURCE),
    f(propertyId, "fire_hazard_zone", parcel.fireHazard, PARCEL_SOURCE, parcel.fireHazard === null ? "Parcel layer has no FHSZ value" : null),
  ];
  if (parcel.lat === null || parcel.lon === null) {
    const why = "Parcel has no centroid, so the point lookup was not run";
    out.push(f(propertyId, "flood_zone", null, FEMA_SOURCE, why), f(propertyId, "coastal_zone", null, COASTAL_SOURCE, why));
    return out;
  }
  out.push(await hwy1SideField(propertyId, parcel.lon, parcel.lat, "the parcel centroid"));
  const [flood, coastal] = await Promise.allSettled([floodZoneAt(parcel.lon, parcel.lat), inCoastalZone(parcel.lon, parcel.lat)]);
  if (flood.status === "rejected") out.push(f(propertyId, "flood_zone", null, FEMA_SOURCE, `FEMA lookup failed: ${String(flood.reason)}`));
  else if (flood.value === null || flood.value.zone === null) out.push(f(propertyId, "flood_zone", null, FEMA_SOURCE, "No NFHL polygon at the parcel centroid"));
  else if (flood.value.zone === "D") out.push(f(propertyId, "flood_zone", null, FEMA_SOURCE, "FEMA zone D: flood hazard undetermined"));
  else out.push(f(propertyId, "flood_zone", flood.value.zone, FEMA_SOURCE, flood.value.sfha ? "Special flood hazard area" : null));
  if (coastal.status === "rejected") out.push(f(propertyId, "coastal_zone", null, COASTAL_SOURCE, `Coastal lookup failed: ${String(coastal.reason)}`));
  else if (coastal.value) out.push(f(propertyId, "coastal_zone", true, COASTAL_SOURCE, "DRAFT boundary layer"));
  // Verified 2026-10-03: the DRAFT layer returns no polygon at a Sea Ranch parcel although its extent covers it, so a miss is not a negative.
  else out.push(f(propertyId, "coastal_zone", null, COASTAL_SOURCE, "DRAFT layer returned no polygon at the centroid; not treated as outside the zone"));
  return out;
}

export interface ParcelResolution {
  readonly parcel: Parcel | null;
  /** How the APN was matched, or why it was not. Stored as the apn note. */
  readonly note: string;
  readonly candidates: readonly Parcel[];
}

/**
 * Address -> APN. Census geocoding interpolates along the street, so the point alone lands on road
 * parcels. We accept a parcel only if it is vacant and exactly one vacant parcel within 80 m matches a
 * listed acreage within 3%. Anything else resolves to null (APN unknown), never a guess.
 */
export async function resolveParcel(lon: number, lat: number, acresHints: readonly number[]): Promise<ParcelResolution> {
  const near = await parcelsNear(lon, lat, 80);
  const vacant = near.filter((p) => /vacant/i.test(p.asmtUseCode ?? "") && p.acres !== null && p.acres > 0);
  const matches = vacant.filter((p) => acresHints.some((a) => Math.abs((p.acres ?? 0) - a) / a <= 0.03));
  if (matches.length === 1) {
    return { parcel: matches[0] ?? null, candidates: matches, note: `Matched by geocode (80 m) + vacant use code + acreage within 3% of listing (${acresHints.join(" / ")} ac)` };
  }
  return {
    parcel: null,
    candidates: matches,
    note: matches.length === 0
      ? `No vacant parcel within 80 m matches the listed acreage (${acresHints.join(" / ")} ac)`
      : `${matches.length} vacant parcels within 80 m match the listed acreage; APN not guessed`,
  };
}

// ---------------------------------------------------------------------------
// Side of Highway One (Caltrans State Highway Network, Route 1 centerline)
// ---------------------------------------------------------------------------

const SHN_URL = "https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHhighway/SHN_Lines/FeatureServer/0/query";
const SHN_SOURCE: SourceRef = { type: "gis", url: SHN_URL, page: null, label: "Caltrans State Highway Network, Route 1 centerline (derived side)" };

type LonLat = readonly [number, number];

/** Closer than this to the centerline, the side is too close to call from a point estimate. */
const MIN_CLEARANCE_M = 30;
/** Farther than this, the nearest road segment is not the Hwy 1 that bounds the lot. */
const MAX_DISTANCE_M = 3_000;

/**
 * "west" or "east" of the nearest Route 1 segment, or null when it cannot be told apart
 * (no road within 3 km, within 30 m of the road, or the road runs east-west).
 * Planar math in a local metre frame: fine at this scale.
 */
export function sideOfRoute(point: LonLat, paths: readonly (readonly LonLat[])[]): "west" | "east" | null {
  const kx = 111_320 * Math.cos((point[1] * Math.PI) / 180);
  const ky = 110_540;
  let best: { dist: number; cross: number; dy: number } | null = null;
  for (const path of paths) {
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (!a || !b) continue;
      const dx = (b[0] - a[0]) * kx;
      const dy = (b[1] - a[1]) * ky;
      const px = (point[0] - a[0]) * kx;
      const py = (point[1] - a[1]) * ky;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const dist = Math.hypot(px - t * dx, py - t * dy);
      if (best === null || dist < best.dist) best = { dist, cross: dx * py - dy * px, dy };
    }
  }
  if (best === null || best.dist > MAX_DISTANCE_M || best.dist < MIN_CLEARANCE_M) return null;
  if (best.dy === 0) return null; // a due east-west segment has no west/east side
  // Heading north (dy > 0): left of travel is west. Heading south: left of travel is east.
  return best.cross > 0 === best.dy > 0 ? "west" : "east";
}

export async function hwy1SideField(propertyId: string, lon: number, lat: number, basis: string): Promise<SpecField> {
  const mk = (value: "west" | "east" | null, note: string): SpecField => ({
    propertyId,
    key: "hwy1_side",
    value,
    status: value === null ? "unknown" : "known",
    source: SHN_SOURCE,
    confidence: null,
    note,
  });
  try {
    const d = 0.03;
    const qs = new URLSearchParams({
      f: "json",
      geometry: `${lon - d},${lat - d},${lon + d},${lat + d}`,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      where: "Route=1",
      outFields: "Route",
      returnGeometry: "true",
      outSR: "4326",
    });
    const res = await fetch(`${SHN_URL}?${qs.toString()}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Caltrans ${res.status}`);
    const body = (await res.json()) as { error?: { message?: string }; features?: { geometry?: { paths?: number[][][] } }[] };
    if (body.error) throw new Error(body.error.message ?? "Caltrans error");
    const paths = (body.features ?? []).flatMap((f) => f.geometry?.paths ?? []).map((p) => p.map((c): LonLat => [c[0] ?? 0, c[1] ?? 0]));
    const side = sideOfRoute([lon, lat], paths);
    return side
      ? mk(side, `Derived from the Caltrans Route 1 centerline at ${basis}; confirm against the recorded tract map`)
      : mk(null, `Side of Hwy 1 could not be derived at ${basis} (no Route 1 within 3 km, or within 30 m of it)`);
  } catch (e) {
    return mk(null, `Caltrans lookup failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
