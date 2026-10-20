import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 text-sm text-muted sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-semibold text-text">Anchor</p>
          <p className="mt-2 max-w-sm">
            Free, open-source outreach planning for public health. Not medical advice.
          </p>
          <p className="mt-2">Built for the Qloo Agentic Hackathon 2026. Powered by Qloo.</p>
        </div>
        <div>
          <p className="font-semibold text-text">Data sources</p>
          <ul className="mt-2 space-y-1">
            <li>CDC PLACES 2025 release (public domain)</li>
            <li>US Census cartographic boundaries 2023 (public domain)</li>
            <li>Map data &copy; OpenStreetMap contributors (ODbL)</li>
            <li>Taste data from Qloo</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-text">More</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="inline-flex min-h-8 items-center hover:text-text" href="/safety">Safety and limits</Link></li>
            <li><Link className="inline-flex min-h-8 items-center hover:text-text" href="/glossary">Glossary</Link></li>
            <li><Link className="inline-flex min-h-8 items-center hover:text-text" href="/research">Research and references</Link></li>
            <li><a className="inline-flex min-h-8 items-center hover:text-text" href="https://github.com/">Source code (MIT licence)</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
