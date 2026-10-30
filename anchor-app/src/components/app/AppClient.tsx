"use client";

import { EXAMPLE_PARTNER_CSV, parsePartnerCsv, type Partner } from "@/lib/domain/partners";
import { COUNTIES, COUNTY_FIPS, type CountyFips } from "@/lib/domain/counties";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CircleDashed,
  Download,
  FileSpreadsheet,
  Link2,
  Loader2,
  Map as MapIcon,
  MapPin,
  MinusCircle,
  Play,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Info } from "@/components/Info";
import { PlanMap } from "@/components/app/PlanMap";
import { PlaceAudience } from "@/components/app/PlaceAudience";
import { PlaceFans } from "@/components/app/PlaceFans";
import { ReadingCorner } from "@/components/app/ReadingCorner";
import { OwnerInvite } from "@/components/app/OwnerInvite";
import { shareUrl } from "@/lib/share";
import { AGE_GROUPS, DAYS, GOALS, type AgeGroup, type Day, type Goal, type Plan, type PlanEvent, type PlanRequest, type StepStatus } from "@/lib/domain/types";
import type { TraceRecord } from "@/lib/trace/ledger";

type Health = { modes: { trust: "qloo" | "offline"; planner: "claude" | "basic" } };
type StepView = { id: string; label: string; status: StepStatus; detail?: string };
type Form = {
  goal: Goal;
  ageGroups: AgeGroup[];
  gender: "any" | "male" | "female";
  county: CountyFips;
  zones: number;
  maxVenues: number;
  days: Day[];
  exclude: string[];
  prompt: string;
  qlooKey: string;
  partners: Partner[];
  partnerNote: string | null;
};

const DEFAULT_FORM: Form = {
  goal: "bp_screening",
  ageGroups: ["35_to_54"],
  gender: "male",
  county: "06037",
  zones: 8,
  maxVenues: 12,
  days: ["saturday", "friday"],
  exclude: [],
  prompt: "",
  qlooKey: "",
  partners: [],
  partnerNote: null,
};

const CATEGORIES = ["Barbershop", "Beauty salon", "Nail salon", "Laundromat", "Restaurant", "Quick-service restaurant", "Gym or sports centre", "Record store", "Grocery store"];
const DAY_LABEL: Record<Day, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const fmt = new Intl.NumberFormat("en-US");

/** modes: what the server runs, written into the page so it shows before any script runs; the health check then confirms it. */
export function AppClient({ modes }: { modes?: Health["modes"] }) {
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [health, setHealth] = useState<Health | null>(modes ? { modes } : null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepView[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [notice, setNotice] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);


  const runBody = useCallback(async (body: object, qlooKey = "") => {
    setStatus("running");
    setError(null);
    setSteps([]);
    setPlan(null);
    setSelectedId(null);
    try {
      const res = await fetch("/api/v1/plans", {
        method: "POST",
        headers: { "content-type": "application/json", ...(qlooKey ? { "x-qloo-key": qlooKey } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `The server answered ${res.status}.`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as PlanEvent;
          if (e.type === "step") {
            setSteps((prev) => {
              const i = prev.findIndex((s) => s.id === e.id);
              const next: StepView = { id: e.id, label: e.label, status: e.status, detail: e.detail ?? prev[i]?.detail };
              return i >= 0 ? prev.map((s, k) => (k === i ? next : s)) : [...prev, next];
            });
          } else if (e.type === "plan") {
            setPlan(e.plan);
            setSelectedId(e.plan.venues[0]?.id ?? null);
            setStatus("done");
            window.history.replaceState(null, "", shareUrl(e.plan, ""));
            requestAnimationFrame(() => resultsRef.current?.focus());
          } else if (e.type === "error") {
            throw new Error(e.message);
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }, []);

  const run = useCallback(
    () =>
      runBody(
        {
          goal: form.goal,
          audience: { ageGroups: form.ageGroups, gender: form.gender },
          area: { countyFips: form.county },
          options: { zones: form.zones, maxVenues: form.maxVenues, preferredDays: form.days, excludeCategories: form.exclude },
          ...(form.prompt.trim() ? { prompt: form.prompt.trim() } : {}),
          ...(form.partners.length ? { partners: form.partners } : {}),
        },
        form.qlooKey,
      ),
    [form, runBody],
  );

  useEffect(() => {
    fetch("/api/v1/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    const id = params.get("plan");
    const settings = readSettings(params.get("r"));
    if (id) {
      fetch(`/api/v1/plans/${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
        .then((p: Plan) => {
          setPlan(p);
          setForm((f) => withRequest(f, p.request));
          setStatus("done");
          setSelectedId(p.venues[0]?.id ?? null);
        })
        .catch(() => {
          if (settings) {
            // Saved plans live in server memory and can expire; the link carries its settings, so make it again.
            setNotice("Anchor made this plan fresh from the settings in your link, with the latest business and Qloo data.");
            setForm((f) => withRequest(f, settings as Partial<PlanRequest>));
            void runBody(settings);
          } else setError("That saved plan could not be found. Plans are kept for a limited time. You can make a new one below.");
        });
    }
  }, [runBody]);

  const selected = plan?.venues.find((v) => v.id === selectedId) ?? null;
  const select = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Plan blood pressure outreach</h1>
          <p className="mt-1 text-muted">Choose who and where. Anchor finds high-need neighbourhoods and trusted local places, then builds a plan you can download.</p>
        </div>
        <ModeBadges health={health} plan={plan} />
      </div>
      {notice ? (
        <p role="status" className="mt-4 rounded-[10px] border border-border bg-surface-2 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Settings and steps */}
        <div className="space-y-6">
          <Settings form={form} setForm={setForm} onRun={run} running={status === "running"} claudeOn={health ? health.modes.planner === "claude" : null} />
          {steps.length > 0 ? <Steps steps={steps} /> : null}
        </div>

        {/* Results */}
        <div ref={resultsRef} tabIndex={-1} aria-label="Results" className="min-w-0 outline-none">
          {error ? <ErrorCard message={error} onRetry={run} /> : null}
          {status === "idle" && !plan && !error ? <EmptyState /> : null}
          {status === "running" && !plan ? <LoadingCard /> : null}
          {plan ? (
            <div className="space-y-5">
              <Summary plan={plan} />
              <div className="flex rounded-[10px] border border-border bg-surface p-0.5 text-sm font-medium lg:hidden" role="group" aria-label="Show results as">
                {(["list", "map"] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="h-11 flex-1 rounded-[8px] text-muted aria-pressed:bg-surface-2 aria-pressed:text-text">
                    {v === "list" ? "List" : "Map"}
                  </button>
                ))}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className={view === "map" ? "hidden lg:block" : ""}>
                  <VenueList plan={plan} selectedId={selectedId} onSelect={select} />
                </div>
                <div className={`space-y-5 ${view === "list" ? "hidden lg:block" : ""}`}>
                  <PlanMap plan={plan} selectedId={selectedId} onSelect={select} />
                </div>
              </div>
              <div ref={detailRef} className="scroll-mt-20">
                {selected ? <VenueDetail plan={plan} venueId={selected.id} /> : null}
              </div>
              <Exports plan={plan} />
              <Removed plan={plan} />
              <Limits plan={plan} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- settings ---------- */

function Field({ label, info, children, hint }: { label: string; info?: Parameters<typeof Info>[0]["id"]; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {info ? <Info id={info} className="-my-2 -mr-3" /> : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="min-h-11 rounded-full border border-border px-3.5 text-sm text-muted hover:text-text aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:font-medium aria-pressed:text-text"
    >
      {children}
    </button>
  );
}

function Settings({
  form,
  setForm,
  onRun,
  running,
  claudeOn,
}: {
  form: Form;
  setForm: (f: Form) => void;
  onRun: () => void;
  running: boolean;
  /** null until the server says which planner is on, so the hint never guesses. */
  claudeOn: boolean | null;
}) {
  const toggle = <T,>(list: T[], item: T, keepOne = true) =>
    list.includes(item) ? (keepOne && list.length === 1 ? list : list.filter((x) => x !== item)) : [...list, item];
  const select = "h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-[0.9375rem]";

  return (
    <form
      className="space-y-5 rounded-[12px] border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
      aria-label="Plan settings"
    >
      <p className="rounded-[8px] bg-accent-soft px-3 py-2 text-sm">An example is filled in. Press Run plan, or change anything first.</p>

      <Field label="Goal" info="input-goal">
        <select className={select} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })} aria-label="Goal">
          {Object.entries(GOALS).map(([k, g]) => (
            <option key={k} value={k}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Age group" info="input-age">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Age group">
          {(Object.keys(AGE_GROUPS) as AgeGroup[]).map((g) => (
            <Chip key={g} pressed={form.ageGroups.includes(g)} onClick={() => setForm({ ...form, ageGroups: toggle(form.ageGroups, g) })}>
              {AGE_GROUPS[g].label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Who" info="input-gender">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who">
          {(
            [
              ["any", "Everyone"],
              ["male", "Men"],
              ["female", "Women"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={form.gender === v}
              onClick={() => setForm({ ...form, gender: v })}
              className="min-h-11 rounded-full border border-border px-3.5 text-sm text-muted aria-checked:border-accent aria-checked:bg-accent-soft aria-checked:font-medium aria-checked:text-text"
            >
              {l}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Where" info="input-county" hint="Adding a county takes one open business register; need data covers every US county.">
        <select className={select} value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value as CountyFips })} aria-label="County">
          {COUNTY_FIPS.map((f) => (
            <option key={f} value={f}>
              {COUNTIES[f].name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={`Zones: ${form.zones}`} info="opt-zones">
          <input type="range" min={3} max={20} value={form.zones} onChange={(e) => setForm({ ...form, zones: Number(e.target.value) })} className="h-11 w-full accent-[var(--accent)]" aria-label="Number of zones" />
        </Field>
        <Field label={`Places: ${form.maxVenues}`} info="opt-places">
          <input type="range" min={5} max={30} value={form.maxVenues} onChange={(e) => setForm({ ...form, maxVenues: Number(e.target.value) })} className="h-11 w-full accent-[var(--accent)]" aria-label="Number of places" />
        </Field>
      </div>

      <Field label="Days" info="opt-days">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preferred days">
          {DAYS.map((d) => (
            <Chip key={d} pressed={form.days.includes(d)} onClick={() => setForm({ ...form, days: toggle(form.days, d) })}>
              {DAY_LABEL[d]}
            </Chip>
          ))}
        </div>
      </Field>

      <details className="group rounded-[10px] border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold">
          More options
          <span className="text-muted group-open:rotate-180" aria-hidden="true">
            &#9662;
          </span>
        </summary>
        <div className="space-y-5 border-t border-border p-3">
          <Field label="Your partner places (optional)" info="input-partners" hint="A CSV of places you already work with: name, latitude, longitude, and type if you like. Places only, never people.">
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Upload your partner places"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const r = parsePartnerCsv(await file.text());
                setForm({
                  ...form,
                  partners: r.partners,
                  partnerNote: r.error ?? `${r.partners.length} places loaded${r.skipped ? `, ${r.skipped} rows skipped (no name or coordinates)` : ""}. Checked in this browser.`,
                });
                e.target.value = "";
              }}
              className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-[10px] file:border file:border-border file:bg-surface file:px-3 file:text-sm file:font-medium"
            />
            <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs">
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE_PARTNER_CSV)}`} download="anchor-partners-example.csv" className="inline-flex min-h-8 items-center text-accent underline underline-offset-2">
                Download an example file
              </a>
              {form.partners.length ? (
                <button type="button" onClick={() => setForm({ ...form, partners: [], partnerNote: null })} className="inline-flex min-h-8 items-center text-muted underline underline-offset-2">
                  Remove partner places
                </button>
              ) : null}
            </p>
            {form.partnerNote ? (
              <p role="status" className={`mt-1 text-xs ${form.partners.length ? "text-success" : "text-danger"}`}>
                {form.partnerNote}
              </p>
            ) : null}
          </Field>
          <Field label="Leave out" info="opt-exclude">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Venue types to leave out">
              {CATEGORIES.map((c) => (
                <Chip key={c} pressed={form.exclude.includes(c)} onClick={() => setForm({ ...form, exclude: toggle(form.exclude, c, false) })}>
                  {c}
                </Chip>
              ))}
            </div>
          </Field>
          <Field
            label="Your request in your own words"
            info="opt-prompt"
            hint={claudeOn === null ? "Checked for policy, then read by the planner." : claudeOn ? "The Claude agent will read this." : "The Claude agent is off on this server, so this note is checked for policy but not read by a model."}
          >
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value.slice(0, 600) })}
              rows={3}
              placeholder="For example: Saturday checks for older men, no restaurants"
              className="w-full rounded-[10px] border border-border bg-surface p-3 text-[0.9375rem]"
            />
          </Field>
          <Field label="Your own Qloo key (optional)" info="use-byok" hint="Used for this plan only. Kept in this browser tab's memory, never saved.">
            <input
              type="password"
              autoComplete="off"
              value={form.qlooKey}
              onChange={(e) => setForm({ ...form, qlooKey: e.target.value.trim() })}
              className="h-11 w-full rounded-[10px] border border-border bg-surface px-3 font-mono text-sm"
              aria-label="Your own Qloo key"
            />
          </Field>
        </div>
      </details>

      <button
        type="submit"
        disabled={running}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-accent text-base font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-60"
      >
        {running ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : <Play aria-hidden="true" size={18} />}
        {running ? "Planning" : "Run plan"}
      </button>
    </form>
  );
}

/* ---------- status ---------- */

function ModeBadges({ health, plan }: { health: Health | null; plan: Plan | null }) {
  const trust = plan?.mode.trust ?? health?.modes.trust;
  const planner = plan?.mode.planner ?? health?.modes.planner;
  if (!trust) return null;
  const badge = "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${badge} ${trust === "qloo" ? "border-success text-success" : "border-warning text-warning"}`}>
        {trust === "qloo" ? "Qloo taste data: on" : "Qloo taste data: off (offline mode)"}
      </span>
      <span className={`${badge} border-border text-muted`}>{planner === "claude" ? "Planner: Claude agent" : "Planner: basic steps"}</span>
      <Info id="mode-badge" className="-my-2" />
    </div>
  );
}

const STATUS_ICON: Record<StepStatus, ReactNode> = {
  running: <Loader2 aria-hidden="true" size={18} className="animate-spin text-accent" />,
  done: <Check aria-hidden="true" size={18} className="text-success" />,
  skipped: <MinusCircle aria-hidden="true" size={18} className="text-warning" />,
  error: <XCircle aria-hidden="true" size={18} className="text-danger" />,
};
const STATUS_WORD: Record<StepStatus, string> = { running: "in progress", done: "done", skipped: "skipped", error: "problem" };

function Steps({ steps }: { steps: StepView[] }) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-5" aria-labelledby="steps-title">
      <div className="flex items-center justify-between">
        <h2 id="steps-title" className="font-semibold">
          What Anchor is doing
        </h2>
        <Info id="agent-steps" className="-my-2 -mr-3" />
      </div>
      <ol className="mt-3 space-y-3" aria-live="polite">
        {steps.map((s) => (
          <li key={s.id} className="flex gap-3">
            <span className="mt-0.5 shrink-0">{STATUS_ICON[s.status]}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {s.label}
                <span className="sr-only">: {STATUS_WORD[s.status]}</span>
              </p>
              {s.detail ? <p className="text-sm text-muted">{s.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-[12px] border border-dashed border-border bg-surface p-8 text-center">
      <div className="max-w-md">
        <MapPin aria-hidden="true" className="mx-auto text-accent" size={32} />
        <h2 className="mt-3 text-lg font-semibold">Your plan will appear here</h2>
        <p className="mt-2 text-muted">
          You will see the neighbourhoods with the most untreated high blood pressure, a ranked list of local places, a map, and
          downloads for your calendar and spreadsheets. Press Run plan to try the example.
        </p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-24 animate-pulse rounded-[12px] bg-surface-2" />
      <div className="h-64 animate-pulse rounded-[12px] bg-surface-2" />
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mb-5 flex gap-3 rounded-[12px] border border-danger bg-surface p-5">
      <AlertTriangle aria-hidden="true" className="shrink-0 text-danger" />
      <div>
        <p className="font-semibold">The plan could not be finished</p>
        <p className="mt-1 text-muted">{message}</p>
        <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center rounded-[10px] border border-border px-4 font-medium hover:bg-surface-2">
          Try again
        </button>
      </div>
    </div>
  );
}

/* ---------- results ---------- */

function Summary({ plan }: { plan: Plan }) {
  const people = plan.zones.reduce((s, z) => s + z.estUntreatedAdults, 0);
  return (
    <section className="rounded-[12px] border border-border bg-surface p-5 shadow-card" aria-labelledby="summary-title">
      {plan.policy.reframed ? (
        <p className="mb-4 flex gap-2 rounded-[8px] border border-warning px-3 py-2 text-sm">
          <ShieldCheck aria-hidden="true" size={18} className="shrink-0 text-warning" />
          <span>
            {plan.policy.message}{" "}
            <Link href="/safety" className="text-accent underline underline-offset-4">
              Why we do this
            </Link>
          </span>
        </p>
      ) : null}
      <h2 id="summary-title" className="text-lg font-semibold">
        Your plan
      </h2>
      <p className="mt-2 text-[1.0625rem]">{plan.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [String(plan.venues.length), "places"],
          [String(plan.zones.length), "high-need zones"],
          [fmt.format(people), "untreated adults (est.)"],
          [String(plan.counts.unsuitableRemoved), "unsuitable left out"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-[10px] bg-surface-2 px-3 py-2">
            <dt className="sr-only">{l}</dt>
            <dd>
              <span className="tabular block text-xl font-semibold">{n}</span>
              <span className="text-xs text-muted">{l}</span>
            </dd>
          </div>
        ))}
      </dl>
      {plan.partnerCheck ? (
        <div className="mt-4 rounded-[10px] border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Your partner places, checked against need</h3>
            <Info id="partner-check" className="-my-2 -mr-3" />
          </div>
          <p className="mt-1 text-sm">
            <span className="tabular font-semibold">{plan.partnerCheck.inHighNeed} of {plan.partnerCheck.uploaded}</span> are in the county&apos;s highest-need neighbourhoods
            (by chance it would be about 1 in 5). {plan.partnerCheck.inPlanZones} are in this plan&apos;s zones and were added to it
            {plan.partnerCheck.outsideCounty ? `; ${plan.partnerCheck.outsideCounty} are outside this county` : ""}.
          </p>
          <details className="mt-2 text-sm">
            <summary className="inline-flex min-h-9 cursor-pointer items-center text-accent underline underline-offset-2">See each place</summary>
            <table className="mt-2 w-full text-left text-xs">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-1">Place</th>
                  <th scope="col" className="py-1">Need (0 to 1)</th>
                  <th scope="col" className="py-1">In this plan</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-border">
                {plan.partnerCheck.places.map((x, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">{x.name}</td>
                    <td className="py-1">{x.needPct === null ? "Outside county" : x.needPct.toFixed(2)}</td>
                    <td className="py-1">{x.inPlan ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      ) : null}
      {plan.localFlavour && plan.localFlavour.tags.length ? (
        <div className="mt-4 rounded-[10px] border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Talking points: what {audienceWords(plan)} here are into</h3>
            <Info id="local-flavour" className="-my-2 -mr-3" />
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {plan.localFlavour.tags.map((t) => (
              <li key={t.name} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                {t.name} <span className="text-muted">&middot; {t.kind}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Use these for flyers and conversations. Sensitive topics are never shown.</p>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted">{plan.mode.note}</p>
    </section>
  );
}

function VenueList({ plan, selectedId, onSelect }: { plan: Plan; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <section aria-labelledby="list-title" className="rounded-[12px] border border-border bg-surface">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 id="list-title" className="font-semibold">
          Places, ranked
        </h2>
        <span className="flex items-center text-sm text-muted">
          Score <Info id="score-anchor" className="-my-2 -mr-3" />
        </span>
      </div>
      {(["partner", "trial", "community"] as const).map((group) => {
        const items = plan.venues.filter((v) => v.group === group);
        if (items.length === 0) return null;
        const heading =
          group === "partner"
            ? "Your partners in high-need neighbourhoods"
            : group === "trial"
            ? "Barbershops and salons"
            : plan.mode.trust === "qloo"
              ? `Places ${audienceWords(plan)} love here`
              : "Other local places";
        const sub =
          group === "partner"
            ? "From the file you added. Places you already work with come first."
            : group === "trial"
            ? "The kind of place the barbershop study tested. From city business licences."
            : plan.mode.trust === "qloo"
              ? "From Qloo taste data: each is in this group's top third by affinity in its zone."
              : "Licensed local businesses. Qloo taste data is off.";
        return (
          <div key={group} className="border-t border-border first:border-t-0">
            <div className="flex items-start justify-between gap-2 px-4 pb-1 pt-3">
              <div>
                <h3 className="text-sm font-semibold">{heading}</h3>
                <p className="text-xs text-muted">{sub}</p>
              </div>
              <Info id={group === "partner" ? "group-partner" : group === "trial" ? "group-trial" : "group-community"} className="-my-2 -mr-3" />
            </div>
            <ol className="divide-y divide-border">
              {items.map((v) => {
                const sel = v.id === selectedId;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      aria-current={sel ? "true" : undefined}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 aria-[current=true]:bg-accent-soft"
                    >
                      <span className={`tabular grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${sel ? "bg-accent text-accent-contrast" : "bg-text text-bg"}`}>{v.rank}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{v.name}</span>
                        <span className="block text-sm text-muted">
                          {v.category} &middot; {v.address}{v.city && v.city !== "Los Angeles" ? `, ${v.city}` : ""}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold">{v.scores.anchor.toFixed(2)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}

function VenueDetail({ plan, venueId }: { plan: Plan; venueId: string }) {
  const v = plan.venues.find((x) => x.id === venueId)!;
  const visit = plan.visits.find((x) => x.venueId === venueId);
  const [trace, setTrace] = useState<TraceRecord[] | null>(null);
  const [traceError, setTraceError] = useState(false);
  const showEvidence = async () => {
    setTraceError(false);
    try {
      const r = await fetch(`/api/v1/plans/${plan.planId}/trace`);
      if (!r.ok) throw new Error();
      setTrace(((await r.json()) as { records: TraceRecord[] }).records);
    } catch {
      setTraceError(true);
    }
  };
  const cited = trace?.filter((r) => v.citations.includes(r.id)) ?? [];
  const rows: [string, string, string][] = [
    ["Need", v.scores.need.toFixed(2), "How high the need is in this zone (0 to 1)"],
    ["Trust", v.scores.trust === null ? "Not available" : v.scores.trust.toFixed(2), v.scores.trust === null ? "Turns on with Qloo" : "How much this group loves the place (Qloo)"],
    ["Evidence", v.scores.evidence.toFixed(2), "Venue type: 1.00 for barbershops and salons, tested in trials"],
    ["Practicality", v.scores.feasible.toFixed(2), "Years in business and preferred days"],
  ];

  return (
    <section aria-labelledby="detail-title" className="rounded-[12px] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            #{v.rank} &middot; {v.category}
          </p>
          <h2 id="detail-title" className="text-xl font-semibold">
            {v.name}
          </h2>
          <p className="text-muted">
            {[v.address, v.city, `CA ${v.zip}`].filter(Boolean).join(", ")}
          </p>
        </div>
        <p className="tabular rounded-[10px] bg-accent-soft px-3 py-2 text-center">
          <span className="block text-2xl font-semibold text-accent">{v.scores.anchor.toFixed(2)}</span>
          <span className="text-xs text-muted">Anchor score</span>
        </p>
      </div>

      <div className="mt-4 rounded-[10px] bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Why this place</h3>
          <Info id="why-place" className="-my-2 -mr-3" />
        </div>
        <p className="mt-1">{v.why}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <table className="w-full text-sm">
          <caption className="mb-1 flex items-center justify-between text-left text-sm font-semibold">
            Score parts <Info id="score-anchor" className="-my-2 -mr-3" />
          </caption>
          <tbody className="divide-y divide-border">
            {rows.map(([k, n, d]) => (
              <tr key={k}>
                <th scope="row" className="py-2 pr-2 text-left font-medium">
                  {k}
                </th>
                <td className="tabular py-2 pr-2">{n}</td>
                <td className="py-2 text-muted">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" size={18} className="text-success" />
            <span>{v.verification.status === "qloo_only" ? "Listed by Qloo" : `Verified: ${v.verification.source.charAt(0).toLowerCase()}${v.verification.source.slice(1)}`}</span>
            <Info id="verified" className="-my-2" />
          </li>
          {v.yearsInBusiness !== null ? (
            <li className="flex items-center gap-2">
              <CircleDashed aria-hidden="true" size={18} className="text-muted" />
              Open here for about {Math.max(1, Math.round(v.yearsInBusiness))} years
            </li>
          ) : null}
          {visit ? (
            <li className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" size={18} className="text-muted" />
              Suggested visit: {new Date(visit.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}, {visit.start} to {visit.end}
            </li>
          ) : null}
          <li>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-accent underline underline-offset-4"
            >
              <MapIcon aria-hidden="true" size={18} /> Open in a map app
            </a>
          </li>
        </ul>
      </div>

      {v.qloo ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PlaceAudience key={v.qloo.entityId} qlooId={v.qloo.entityId} highlight={{ ages: plan.request.audience.ageGroups.flatMap((g) => [...AGE_GROUPS[g].qloo]), gender: plan.request.audience.gender }} />
          <PlaceFans key={`fans-${v.qloo.entityId}`} qlooId={v.qloo.entityId} county={plan.request.area.countyFips} />
          <div className="space-y-3 rounded-[10px] border border-border p-4 text-sm">
            <h3 className="font-semibold">From Qloo</h3>
            {v.qloo.categories.length ? <p><span className="text-muted">Kind of place:</span> {v.qloo.categories.join(", ")}</p> : null}
            {v.qloo.tags.length ? (
              <p className="flex flex-wrap gap-1.5">
                {v.qloo.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">{t}</span>
                ))}
              </p>
            ) : null}
            {v.qloo.openDays ? <p><span className="text-muted">Open:</span> {v.qloo.openDays.map((d) => d[0].toUpperCase() + d.slice(1, 3)).join(", ")}</p> : null}
            {v.qloo.servesAlcohol ? <p className="text-warning">Also serves alcohol. Plan the event away from any bar area, or choose another place.</p> : null}
          </div>
        </div>
      ) : null}

      {v.group === "trial" ? (
        <div className="mt-4">
          <ReadingCorner key={v.id} venueName={v.name} />
        </div>
      ) : null}

      <div className="mt-4">
        <OwnerInvite key={`inv-${v.id}`} plan={plan} venue={v} audience={audienceWords(plan)} />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={showEvidence} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-medium hover:bg-surface-2">
            Show evidence ({v.citations.length} records)
          </button>
          <Info id="evidence" className="-my-2" />
        </div>
        {traceError ? <p className="mt-2 text-sm text-danger">The evidence could not be loaded. Please try again.</p> : null}
        {trace ? (
          <ol className="mt-3 space-y-2 text-sm">
            {cited.map((r) => (
              <li key={r.id} className="rounded-[8px] bg-surface-2 p-3">
                <p className="font-medium">
                  {r.id} &middot; {r.tool}
                </p>
                <p className="text-muted">{r.summary}</p>
                <p className="layer-technical mt-1 break-all font-mono text-xs text-muted">
                  hash {r.hash.slice(0, 23)}... &middot; prev {r.prevHash.slice(0, 23)}...
                </p>
              </li>
            ))}
            <li>
              <a href={`/api/v1/plans/${plan.planId}/verify`} className="inline-flex min-h-11 items-center gap-1 font-medium text-accent underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                Check the whole evidence chain
              </a>
            </li>
          </ol>
        ) : null}
      </div>
    </section>
  );
}

function Exports({ plan }: { plan: Plan }) {
  const [copied, setCopied] = useState(false);
  const base = `/api/v1/plans/${plan.planId}/export`;
  const item = "inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-medium hover:bg-surface-2";
  return (
    <section aria-labelledby="export-title" className="rounded-[12px] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 id="export-title" className="font-semibold">
          Download your plan
        </h2>
        <Info id="export" className="-my-2 -mr-3" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className={item} href={`${base}/csv`} download>
          <FileSpreadsheet aria-hidden="true" size={18} /> Spreadsheet (CSV)
        </a>
        <a className={item} href={`${base}/ics`} download>
          <CalendarDays aria-hidden="true" size={18} /> Calendar (ICS)
        </a>
        <a className={item} href={`${base}/geojson`} download>
          <MapIcon aria-hidden="true" size={18} /> Map file (GeoJSON)
        </a>
        <a className={item} href={`${base}/json`} download>
          <Download aria-hidden="true" size={18} /> Full plan (JSON)
        </a>
        <button
          type="button"
          className={item}
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl(plan, window.location.origin));
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
        >
          <Link2 aria-hidden="true" size={18} /> {copied ? "Link copied" : "Copy share link"}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Share link copied" : ""}
      </p>
    </section>
  );
}

function Removed({ plan }: { plan: Plan }) {
  if (plan.removed.length === 0) return null;
  const byCat = plan.removed.reduce<Record<string, number>>((m, r) => ((m[r.category] = (m[r.category] ?? 0) + 1), m), {});
  return (
    <details className="rounded-[12px] border border-border bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 font-semibold">
        <span>{plan.removed.length} places left out</span>
        <Info id="removed" className="-my-2 -mr-3" />
      </summary>
      <div className="border-t border-border px-5 py-4 text-sm">
        <p className="text-muted">
          {Object.entries(byCat)
            .map(([c, n]) => `${n} ${c.toLowerCase()}${n === 1 ? "" : "s"}`)
            .join(", ")}
          . Health events should not happen in alcohol-centred venues.
        </p>
        <ul className="mt-2 columns-1 gap-6 sm:columns-2">
          {plan.removed.slice(0, 40).map((r, i) => (
            <li key={`${r.name}-${i}`} className="break-inside-avoid py-0.5">
              {r.name} <span className="text-muted">({r.reason})</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function Limits({ plan }: { plan: Plan }) {
  return (
    <section aria-labelledby="limits-title" className="rounded-[12px] border border-border bg-surface p-5">
      <h2 id="limits-title" className="font-semibold">
        What this plan does not tell you
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        {plan.limits.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

function audienceWords(plan: Plan): string {
  const ages = plan.request.audience.ageGroups.map((g) => AGE_GROUPS[g].label).join(" and ");
  const who = plan.request.audience.gender === "male" ? "men" : plan.request.audience.gender === "female" ? "women" : "adults";
  return `${who} aged ${ages}`;
}

function readSettings(r: string | null): object | null {
  if (!r || r.length > 4000) return null;
  try {
    const json = decodeURIComponent(escape(atob(r.replace(/-/g, "+").replace(/_/g, "/"))));
    const v = JSON.parse(json) as unknown;
    return v && typeof v === "object" ? (v as object) : null;
  } catch {
    return null;
  }
}

/** Show a loaded or rebuilt plan's settings in the form, so what you see matches the plan. */
function withRequest(f: Form, r: Partial<PlanRequest>): Form {
  return {
    ...f,
    goal: r.goal ?? f.goal,
    ageGroups: r.audience?.ageGroups ?? f.ageGroups,
    gender: r.audience?.gender ?? f.gender,
    county: r.area?.countyFips ?? f.county,
    zones: r.options?.zones ?? f.zones,
    maxVenues: r.options?.maxVenues ?? f.maxVenues,
    days: r.options?.preferredDays ?? f.days,
    exclude: r.options?.excludeCategories ?? f.exclude,
    prompt: r.prompt ?? "",
  };
}
