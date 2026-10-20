/**
 * Bring your own data: a partner list (places a health team already works
 * with). Parsed in the browser before anything is sent, and checked again on
 * the server by the PlanRequest schema.
 *
 * Rules (shared/PLATFORM.md, bring your own data):
 *   - Places only. A file with columns about people (names of patients, birth
 *     dates, phone numbers, diagnoses...) is refused outright.
 *   - Coordinates are required. Anchor does not send addresses to a geocoder.
 *   - At most MAX_PARTNERS rows.
 */

export const MAX_PARTNERS = 200;

export type Partner = { name: string; lat: number; lon: number; category?: string };
export type ParseResult = { partners: Partner[]; skipped: number; error: string | null };

const PERSON_COLUMN = /\b(patient|client|dob|birth|ssn|social security|mrn|medical record|diagnos\w*|conditions?|medications?|phone|mobile|email|e-mail|first ?name|last ?name|surname|gender|sex|race|ethnicity|age|insurance|member ?id)\b/i;
const NAME = /^(name|place|venue|business|business name|partner|organisation|organization)$/i;
const LAT = /^(lat|latitude|y)$/i;
const LON = /^(lon|lng|long|longitude|x)$/i;
const CATEGORY = /^(type|kind|category|venue type)$/i;

/** One CSV line into cells, with quoted cells ("Joe's, Inc"). */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parsePartnerCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { partners: [], skipped: 0, error: "The file needs a header row and at least one place." };
  const header = cells(lines[0]);
  const person = header.find((h) => PERSON_COLUMN.test(h));
  if (person) return { partners: [], skipped: 0, error: `This file has a column about people ("${person}"). Anchor only accepts lists of places, so nothing was loaded.` };
  const iName = header.findIndex((h) => NAME.test(h));
  const iLat = header.findIndex((h) => LAT.test(h));
  const iLon = header.findIndex((h) => LON.test(h));
  const iCat = header.findIndex((h) => CATEGORY.test(h));
  if (iName < 0 || iLat < 0 || iLon < 0) return { partners: [], skipped: 0, error: "Columns needed: name, latitude and longitude (type is optional)." };
  if (lines.length - 1 > MAX_PARTNERS) return { partners: [], skipped: 0, error: `Up to ${MAX_PARTNERS} places per file; this one has ${lines.length - 1}.` };

  const partners: Partner[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const c = cells(line);
    const name = (c[iName] ?? "").slice(0, 80);
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) {
      skipped += 1;
      continue;
    }
    const category = iCat >= 0 ? (c[iCat] ?? "").slice(0, 40) : "";
    partners.push({ name, lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, ...(category ? { category } : {}) });
  }
  if (partners.length === 0) return { partners: [], skipped, error: "No rows had a name and valid coordinates." };
  return { partners, skipped, error: null };
}

export const EXAMPLE_PARTNER_CSV = [
  "name,latitude,longitude,type",
  "Example Barber Lounge,33.9601,-118.3009,Barbershop",
  "Example Family Market,33.9455,-118.2912,Grocery store",
  "Example Community Gym,34.0522,-118.4437,Gym",
].join("\n");
