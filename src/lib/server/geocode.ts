/** US Census geocoder (free, no key). Interpolated points: callers must cross-check the parcel it lands on. */
export interface GeocodeHit {
  readonly matchedAddress: string;
  readonly lon: number;
  readonly lat: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeHit | null> {
  const qs = new URLSearchParams({ address, benchmark: "Public_AR_Current", format: "json" });
  const res = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${qs.toString()}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Census geocoder ${res.status}`);
  const body = (await res.json()) as {
    result?: { addressMatches?: { matchedAddress?: string; coordinates?: { x?: number; y?: number } }[] };
  };
  const m = body.result?.addressMatches?.[0];
  if (!m || typeof m.coordinates?.x !== "number" || typeof m.coordinates.y !== "number") return null;
  return { matchedAddress: m.matchedAddress ?? address, lon: m.coordinates.x, lat: m.coordinates.y };
}
