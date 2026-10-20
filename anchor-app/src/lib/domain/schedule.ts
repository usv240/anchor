import { DAYS, type Day, type Visit } from "@/lib/domain/types";

/**
 * Turns ranked venues into a visit schedule: two 2-hour visits per suggested
 * day (10:00 to 12:00 and 13:00 to 15:00 local time), starting next week, in
 * rank order. Simple on purpose; health workers adjust it in their calendar.
 */

const SLOTS = [
  { start: "10:00", end: "12:00" },
  { start: "13:00", end: "15:00" },
];

function nextDate(from: Date, day: Day): Date {
  const target = DAYS.indexOf(day); // 0 = monday
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  // Start from next Monday so the first week is a full planning week.
  const jsDay = d.getUTCDay(); // 0 = sunday
  const toMonday = ((8 - jsDay) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + toMonday + target);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function buildSchedule(venueIds: string[], days: Day[], from: Date): Visit[] {
  const order = [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
  const visits: Visit[] = [];
  let week = 0;
  let i = 0;
  while (i < venueIds.length) {
    for (const day of order) {
      const date = nextDate(from, day);
      date.setUTCDate(date.getUTCDate() + week * 7);
      for (const slot of SLOTS) {
        if (i >= venueIds.length) break;
        visits.push({ venueId: venueIds[i], day, date: iso(date), start: slot.start, end: slot.end });
        i += 1;
      }
      if (i >= venueIds.length) break;
    }
    week += 1;
  }
  return visits;
}
