import Link from "next/link";

/** A page whose feature is still being built. It says so plainly, with what will be here and when. */
export function PlannedPage({
  title,
  summary,
  items,
  ready,
}: {
  title: string;
  summary: string;
  items: string[];
  ready: string;
}) {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{summary}</p>
      <div className="mt-8 rounded-[12px] border border-border bg-surface p-6">
        <p className="font-semibold">This page is being built. Ready by {ready}.</p>
        <p className="mt-2 text-muted">What you will find here:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      <Link href="/" className="mt-8 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4">
        Back to the overview
      </Link>
    </div>
  );
}
