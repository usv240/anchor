"use client";

import { useState } from "react";
import { BookOpen, Loader2, Printer, X } from "lucide-react";
import { Info } from "@/components/Info";

type Book = {
  title: string;
  series: string | null;
  year: number | null;
  publisher: string | null;
  isbn13: string | null;
  image: string | null;
  blurb: string;
  because?: string[];
  links: { openLibrary: string | null; worldcat: string | null };
};
type Result = { interests: { query: string; matched: { name: string; type: string } | null }[]; books: Book[]; removed: { title: string; reason: string }[]; unused?: string[] };

const SUGGESTIONS = ["Minecraft", "Pokemon", "Spider-Man", "Bluey", "Roblox", "Sonic the Hedgehog", "Frozen", "LeBron James"];

/**
 * Reading corner: the barber names what the kids who come in love, and Qloo
 * finds children's books fans of those things love. Checked against Open
 * Library and children's publishers before anything is shown.
 */
export function ReadingCorner({ venueName }: { venueName: string }) {
  const [interests, setInterests] = useState<string[]>(["Minecraft", "Pokemon", "Spider-Man"]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (s: string) => {
    const v = s.trim();
    if (v && !interests.includes(v) && interests.length < 4) setInterests([...interests, v]);
    setDraft("");
  };

  async function find() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/v1/books", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ interests, take: 6 }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "Books could not be found.");
      setResult(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reading-corner rounded-[10px] border border-border p-4" aria-labelledby="rc-title">
      <div className="flex items-center justify-between">
        <h3 id="rc-title" className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen aria-hidden="true" size={18} className="text-accent" /> Reading corner for kids
        </h3>
        <Info id="reading-corner" className="-my-2 -mr-3" />
      </div>
      <p className="mt-1 text-sm text-muted">What do the kids who come here love? Pick up to 4 games, shows, films or stars.</p>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Chosen interests">
        {interests.map((i) => (
          <span key={i} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-accent bg-accent-soft pl-3 pr-1 text-sm">
            {i}
            <button type="button" aria-label={`Remove ${i}`} onClick={() => setInterests(interests.filter((x) => x !== i))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
              <X aria-hidden="true" size={14} />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 60))}
          placeholder={interests.length >= 4 ? "Up to 4 interests" : "Add another, for example Bluey"}
          disabled={interests.length >= 4}
          aria-label="Add an interest"
          list="rc-suggestions"
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm"
        />
        <datalist id="rc-suggestions">
          {SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="submit" disabled={interests.length >= 4 || !draft.trim()} className="min-h-11 rounded-[10px] border border-border px-3 text-sm font-medium disabled:opacity-50">
          Add
        </button>
      </form>
      <button
        type="button"
        onClick={find}
        disabled={busy || interests.length === 0}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-semibold text-accent-contrast disabled:opacity-60"
      >
        {busy ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <BookOpen aria-hidden="true" size={16} />} Find books
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}

      {result ? (
        <div className="mt-4" aria-live="polite">
          <p className="text-xs text-muted">
            Matched:{" "}
            {result.interests.map((i) => (i.matched ? `${i.matched.name} (${i.matched.type.replace("_", " ")})` : `${i.query} (not found)`)).join(", ")}
          </p>
          {result.unused?.length ? (
            <p className="mt-1 text-xs text-muted">
              Qloo found no book links for {result.unused.join(" or ")}, so {result.unused.length === 1 ? "it" : "they"} did not shape this list. Try swapping in another interest.
            </p>
          ) : null}
          {result.books.length === 0 ? (
            <p className="mt-2 text-sm">No children&apos;s books passed the checks for these interests. Try different ones.</p>
          ) : (
            <ol className="mt-3 grid gap-3 sm:grid-cols-2">
              {result.books.map((b) => (
                <li key={b.title} className="flex gap-3 rounded-[10px] bg-surface-2 p-3">
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image} alt="" width={56} height={84} loading="lazy" className="h-[84px] w-14 shrink-0 rounded object-cover" />
                  ) : null}
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-xs text-muted">{[b.publisher, b.year].filter(Boolean).join(", ")}</p>
                    {b.because?.length ? <p className="mt-1 text-xs font-medium text-accent">Mostly for fans of {b.because[0]}</p> : null}
                    {b.blurb ? <p className="mt-1 line-clamp-3 text-xs">{b.blurb}</p> : null}
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                      {b.links.worldcat ? (
                        <a href={b.links.worldcat} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center text-accent underline underline-offset-2">
                          Find in a library
                        </a>
                      ) : null}
                      {b.links.openLibrary ? (
                        <a href={b.links.openLibrary} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center text-accent underline underline-offset-2">
                          Open Library
                        </a>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {result.removed.length ? (
            <p className="mt-2 text-xs text-muted">
              {result.removed.length} book{result.removed.length === 1 ? " was" : "s were"} left out because they could not be confirmed as children&apos;s books.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              document.documentElement.dataset.print = "reading";
              window.print();
              delete document.documentElement.dataset.print;
            }}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-medium hover:bg-surface"
          >
            <Printer aria-hidden="true" size={16} /> Print the book list for {venueName}
          </button>
          <p className="mt-2 text-xs text-muted">Please look through each book before shelving it. Ask your local library about free or donated copies.</p>
        </div>
      ) : null}
    </section>
  );
}
