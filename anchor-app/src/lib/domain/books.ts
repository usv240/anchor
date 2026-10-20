import { QlooClient } from "@/lib/qloo/client";

/**
 * Reading corner: books children will want to pick up, found through the
 * games, shows, films and stars they already love (Qloo's cross-domain taste
 * graph). Inspired by Barbershop Books, which puts children's books in
 * barbershops (over 200 partner shops; an independent evaluation found boys were
 * more likely to be seen reading and to call themselves readers).
 *
 * Safety by construction (found Oct 19): with no filter, a mix of interests that
 * includes a real person (for example an athlete) can return adult non-fiction,
 * including titles wholly unsuitable for children. So every request is limited
 * to Qloo's children's genres, and results are checked again here.
 */

export const KIDS_GENRES = [
  "urn:tag:genre:media:childrens",
  "urn:tag:genre:media:juvenile",
  "urn:tag:genre:media:middle_grade",
  "urn:tag:genre:media:picture_books",
  "urn:tag:genre:media:kids",
];

const INTEREST_TYPES = "urn:entity:videogame,urn:entity:tv_show,urn:entity:movie,urn:entity:artist,urn:entity:person";

/**
 * Third line of defence: an independent check. A book is kept only if Open
 * Library (Internet Archive's public catalogue) files it as a children's book,
 * or its publisher is a children's imprint. Test on Oct 19: the genre filter
 * alone still let through an adult memoir and an adult parenting book.
 */
const KIDS_SUBJECT = /(juvenile|children's (fiction|literature|books|stories|poetry|nonfiction)|childrens (fiction|books)|picture books?|middle grade|ages? \d|grades? [k\d]|young readers|easy readers|beginning readers|chapter books?|board books?)/i;
export const KIDS_IMPRINT =
  /(scholastic|graphix|puffin|disney( press| hyperion| lucasfilm)?|hyperion books for children|for young readers|young readers|children'?s books|candlewick|aladdin|golden books|little golden|usborne|dk children|nickelodeon|lerner|capstone|kids can press|feiwel|roaring brook|holiday house|chronicle books for children|harpercollins children|harper ?festival|katherine tegen|balzer \+ bray|greenwillow|walker books|egmont|ladybird|orchard books|dial books|kokila|nancy paulsen|g\.p\. putnam's sons books for young readers|atheneum books for young readers|margaret k\. mcelderry|clarion|houghton mifflin harcourt books for young readers|amulet|abrams appleseed|workman|bloomsbury children)/i;

export type OpenLibraryCheck = (isbns: string[]) => Promise<Map<string, string[]>>;

/** One Open Library request for a whole list of ISBNs. Returns subjects per ISBN found. */
export function openLibraryChecker(cache?: { get(k: string): Promise<string | undefined>; set(k: string, v: string): Promise<void> }, fetchImpl: typeof fetch = fetch): OpenLibraryCheck {
  return async (isbns) => {
    const out = new Map<string, string[]>();
    if (isbns.length === 0) return out;
    const q = `isbn:(${isbns.join(" OR ")})`;
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=isbn,subject&limit=${Math.min(100, isbns.length * 2)}`;
    let body = await cache?.get(`ol:${url}`);
    if (!body) {
      const res = await fetchImpl(url, {
        headers: { "User-Agent": "anchor-hackathon/0.1 (open-source public health tool; contact via GitHub issues)" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`Open Library answered ${res.status}`);
      body = await res.text();
      await cache?.set(`ol:${url}`, body);
    }
    const docs = (JSON.parse(body) as { docs?: { isbn?: string[]; subject?: string[] }[] }).docs ?? [];
    for (const d of docs) for (const i of d.isbn ?? []) if (isbns.includes(i)) out.set(i, [...(out.get(i) ?? []), ...(d.subject ?? [])]);
    return out;
  };
}

/** Second line of defence on top of the genre filter. */
const ADULT = /\b(erotic|erotica|explicit|sexual|sex|steamy|seduc\w*|pimp|nsfw|adult content|18\+|bdsm|lingerie)\b/i;
const BUNDLE = /\b(box ?set|boxset|collection|books? #?\d+\s*(-|to)\s*#?\d+|omnibus|bundle)\b/i;

export type Interest = { query: string; matched: { name: string; type: string; entityId: string } | null };

export type Book = {
  title: string;
  series: string | null;
  year: number | null;
  publisher: string | null;
  isbn13: string | null;
  image: string | null;
  blurb: string;
  affinity: number;
  /** The interest that clearly led Qloo to this book (explainability score 0.6 or more); usually empty when credit is shared. */
  because: string[];
  links: { openLibrary: string | null; worldcat: string | null };
};

/** unused: matched interests that shaped none of Qloo's books (explainability), so the user can try another. */
export type BookResult = { interests: Interest[]; books: Book[]; removed: { title: string; reason: string }[]; unused: string[]; traceIds: string[] };

type SearchResp = { results?: { entity_id: string; name: string; types?: string[]; type?: string }[] };
type BookEntity = {
  name: string;
  properties?: {
    title?: string;
    series_name?: string;
    publication_year?: string | number;
    publisher?: string;
    isbn13?: string;
    language?: string;
    description?: string;
    image?: { url?: string };
  };
  query?: { affinity?: number; explainability?: { "signal.interests.entities"?: { entity_id: string; score: number }[] } };
};

const decode = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** "Wings of Fire: Legends" and "Wings of Fire Graphic Novel" are the same series for variety purposes. */
export function seriesRoot(s: string): string {
  return s
    .toLowerCase()
    .split(/[:(]|\bgraphic novels?\b|\blegends\b|\bwinglets\b|\bbook\b/)[0]
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function findBooks(client: QlooClient, interests: string[], take = 6, check?: OpenLibraryCheck): Promise<BookResult> {
  const traceIds: string[] = [];
  const resolved: Interest[] = [];
  for (const q of interests.map((s) => s.trim()).filter(Boolean).slice(0, 4)) {
    const r = await client.search<SearchResp>(q, INTEREST_TYPES, 3);
    if (r.traceId) traceIds.push(r.traceId);
    const top = r.data.results?.[0];
    resolved.push({
      query: q,
      matched: top ? { name: top.name, type: (top.types?.[0] ?? top.type ?? "").replace("urn:entity:", ""), entityId: top.entity_id } : null,
    });
  }
  const ids = resolved.flatMap((i) => (i.matched ? [i.matched.entityId] : []));
  if (ids.length === 0) return { interests: resolved, books: [], removed: [], unused: [], traceIds };

  const res = await client.insights<{ results?: { entities?: BookEntity[] } }>(
    {
      "filter.type": "urn:entity:book",
      "signal.interests.entities": ids.join(","),
      "filter.tags": KIDS_GENRES.join(","),
      "operator.filter.tags": "union",
      "feature.explainability": true,
      take: 40,
    },
    (d) => `${d.results?.entities?.length ?? 0} children's books`,
  );
  if (res.traceId) traceIds.push(res.traceId);

  const nameOf = new Map(resolved.flatMap((i) => (i.matched ? [[i.matched.entityId.toUpperCase(), i.query] as const] : [])));
  const because = (e: BookEntity) =>
    (e.query?.explainability?.["signal.interests.entities"] ?? [])
      .filter((x) => x.score >= 0.6)
      .sort((a, b) => b.score - a.score)
      .flatMap((x) => nameOf.get(x.entity_id.toUpperCase()) ?? []);
  const credited = new Set(
    (res.data.results?.entities ?? []).flatMap((e) => (e.query?.explainability?.["signal.interests.entities"] ?? []).filter((x) => x.score > 0.05).map((x) => x.entity_id.toUpperCase())),
  );
  const anyExplained = (res.data.results?.entities ?? []).some((e) => e.query?.explainability);
  const unused = anyExplained ? resolved.flatMap((i) => (i.matched && !credited.has(i.matched.entityId.toUpperCase()) ? [i.matched.name] : [])) : [];
  const books: Book[] = [];
  const removed: BookResult["removed"] = [];
  const seenSeries = new Set<string>();
  const entities = res.data.results?.entities ?? [];
  const isbns = entities.map((e) => e.properties?.isbn13 ?? "").filter((i) => /^\d{13}$/.test(i));
  let subjects = new Map<string, string[]>();
  let checked = false;
  if (check) {
    try {
      subjects = await check(isbns);
      checked = true;
    } catch {
      checked = false; // Open Library unavailable: fall back to imprint-only, stated in the result
    }
  }
  for (const e of entities) {
    const p = e.properties ?? {};
    const title = decode(p.title ?? e.name);
    const blurb = decode(p.description ?? "").replace(/\s+/g, " ").trim();
    if (ADULT.test(title) || ADULT.test(blurb)) {
      removed.push({ title, reason: "Adult content words in the title or description" });
      continue;
    }
    const kidsSubject = (subjects.get(p.isbn13 ?? "") ?? []).some((s) => KIDS_SUBJECT.test(s));
    const kidsImprint = KIDS_IMPRINT.test(p.publisher ?? "");
    if (check && !kidsSubject && !kidsImprint) {
      removed.push({ title, reason: checked ? "Not confirmed as a children's book (Open Library subjects and publisher)" : "Not confirmed as a children's book (publisher)" });
      continue;
    }
    if (p.language && p.language !== "English") continue;
    if (BUNDLE.test(title)) continue; // a shelf wants single books, not box sets
    const series = p.series_name ? decode(p.series_name) : null;
    const root = seriesRoot(series ?? title.replace(/\s*\(.*$/, ""));
    if (seenSeries.has(root)) continue; // variety: one book per series
    seenSeries.add(root);
    const isbn = p.isbn13 && /^\d{13}$/.test(p.isbn13) ? p.isbn13 : null;
    books.push({
      title,
      series,
      year: p.publication_year ? Number(p.publication_year) : null,
      publisher: p.publisher ?? null,
      isbn13: isbn,
      image: p.image?.url ?? null,
      blurb: blurb.length > 220 ? blurb.slice(0, 217).replace(/\s+\S*$/, "") + "..." : blurb,
      affinity: Math.round((e.query?.affinity ?? 0) * 100) / 100,
      because: because(e),
      links: {
        openLibrary: isbn ? `https://openlibrary.org/isbn/${isbn}` : null,
        worldcat: isbn ? `https://search.worldcat.org/isbn/${isbn}` : null,
      },
    });
    if (books.length >= take) break;
  }
  return { interests: resolved, books, removed, unused, traceIds };
}
