"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, Printer } from "lucide-react";
import { Info } from "@/components/Info";
import type { Plan, PlanVenue } from "@/lib/domain/types";

const fmt = new Intl.NumberFormat("en-US");
const DATE = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/**
 * The owner invitation: a short, editable letter asking the venue to host a
 * check. Built from the plan itself (visit time, the neighbourhood's need
 * estimate, and Qloo talking points when present). No model writes it, so it
 * can never make a health claim the plan does not support.
 */
export function inviteText(plan: Plan, v: PlanVenue, from: string, audience: string): string {
  const visit = plan.visits.find((x) => x.venueId === v.id);
  const zone = plan.zones.find((z) => z.zoneId === v.zoneId);
  const when = visit ? `${DATE.format(new Date(`${visit.date}T12:00:00Z`))}, ${visit.start} to ${visit.end}` : "a day and time that suits you";
  const tags = (plan.localFlavour?.zoneId === v.zoneId ? plan.localFlavour.tags : []).slice(0, 3).map((t) => t.name.toLowerCase());
  const who = from.trim() || "[your organisation]";
  const lines = [
    `Hello ${v.name} team,`,
    "",
    `We are ${who}, and we run free blood pressure checks in this neighbourhood. ${v.name} is a place ${audience} here already know and trust, so we would love to hold a short session with you.`,
    "",
    `Proposed: ${when}.`,
    "We bring a trained health worker and a blood pressure cuff. A check takes about 5 minutes, is free, and needs no appointment. There is nothing to buy and nothing for you to do except say yes.",
    "",
    zone ? `Why here: about ${fmt.format(zone.estUntreatedAdults)} adults in this neighbourhood have high blood pressure and no medicine for it (CDC estimate). Most of them feel fine, so they do not go to a clinic.` : "",
    tags.length ? `People around here are into ${tags.length > 1 ? `${tags.slice(0, -1).join(", ")} and ${tags.at(-1)}` : tags[0]}, so we can plan the day around that.` : "",
    "",
    "Could we stop by to say hello and answer any questions?",
    "",
    "Thank you,",
    "[your name and phone number]",
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
}

export function OwnerInvite({ plan, venue, audience }: { plan: Plan; venue: PlanVenue; audience: string }) {
  const [from, setFrom] = useState("");
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const draft = useMemo(() => inviteText(plan, venue, from, audience), [plan, venue, from, audience]);
  const text = edited ?? draft;

  return (
    <section className="owner-invite rounded-[10px] border border-border p-4" aria-labelledby={`inv-${venue.id}`}>
      <div className="flex items-center justify-between">
        <h3 id={`inv-${venue.id}`} className="flex items-center gap-2 text-sm font-semibold">
          <Mail aria-hidden="true" size={18} className="text-accent" /> Invite this place
        </h3>
        <Info id="owner-invite" className="-my-2 -mr-3" />
      </div>
      <p className="mt-1 text-sm text-muted">A short letter to ask the owner to host a check. Edit it, then copy, print or send it yourself.</p>
      <label className="mt-3 block text-sm font-medium">
        Your organisation
        <input
          value={from}
          onChange={(e) => {
            setFrom(e.target.value.slice(0, 80));
            setEdited(null);
          }}
          placeholder="For example: South LA Community Health Workers"
          className="mt-1 h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-sm font-normal"
        />
      </label>
      <label className="mt-3 block text-sm font-medium">
        Letter
        <textarea
          value={text}
          onChange={(e) => setEdited(e.target.value.slice(0, 3000))}
          rows={14}
          className="invite-text mt-1 w-full rounded-[10px] border border-border bg-surface p-3 text-sm font-normal leading-relaxed"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-3 text-sm font-medium"
        >
          {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />} {copied ? "Copied" : "Copy letter"}
        </button>
        <button
          type="button"
          onClick={() => {
            document.documentElement.dataset.print = "invite";
            window.print();
            delete document.documentElement.dataset.print;
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-3 text-sm font-medium"
        >
          <Printer aria-hidden="true" size={16} /> Print
        </button>
        {edited !== null ? (
          <button type="button" onClick={() => setEdited(null)} className="inline-flex min-h-11 items-center px-2 text-sm text-muted underline underline-offset-2">
            Start again
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted">Anchor never sends messages for you. Nothing you type here is saved.</p>
    </section>
  );
}
