import type { Metadata } from "next";
import { GLOSSARY } from "@/content/glossary";

export const metadata: Metadata = { title: "Glossary" };

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
      <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Glossary</h1>
      <p className="mt-4 text-lg text-muted">Every term used on this site, in plain words.</p>
      <nav aria-label="Jump to a term" className="mt-6 flex flex-wrap gap-2">
        {GLOSSARY.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:bg-surface-2"
          >
            {t.term}
          </a>
        ))}
      </nav>
      <dl className="mt-10 divide-y divide-border">
        {GLOSSARY.map((t) => (
          <div key={t.id} id={t.id} className="scroll-mt-24 py-5">
            <dt className="text-lg font-semibold">{t.term}</dt>
            <dd className="mt-1 text-muted">{t.meaning}</dd>
            {t.example ? <dd className="mt-1 text-sm text-muted">Example: {t.example}</dd> : null}
          </div>
        ))}
      </dl>
    </div>
  );
}
