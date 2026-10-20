/** Small geography helpers. No dependencies, so they run anywhere (server, browser, tests). */

export type LatLon = { lat: number; lon: number };

/** Great-circle distance in metres. */
export function metres(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Normalised business name for matching across sources (Qloo, licences, OSM). */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|llc|inc|corp|co|shop|shoppe|salon|barbershop|barber|barbers|studio|beauty|hair|lounge|restaurant)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
