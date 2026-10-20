/** Every term on the site, in plain words. Source: anchor/UX_AND_CONTENT.md, section 8. */

export type Term = { id: string; term: string; meaning: string; example?: string };

export const GLOSSARY: Term[] = [
  { id: "affinity", term: "Affinity", meaning: "Qloo's score for how much a group of people likes something, compared with average.", example: "A barbershop with high affinity for men aged 35 to 54 is one that group likes much more than most places." },
  { id: "agent", term: "Agent", meaning: "An AI program that takes several steps on its own, such as searching, checking and deciding, to finish a task." },
  { id: "api", term: "API", meaning: "A way for one piece of software to ask another for information or actions automatically." },
  { id: "api-key", term: "API key", meaning: "A secret code that identifies the software using an API, so usage stays fair and safe." },
  { id: "byod", term: "Bring your own data (BYOD)", meaning: "Adding your own files, such as a list of partner venues, so Anchor can use what you already know." },
  { id: "byok", term: "Bring your own key (BYOK)", meaning: "Using your own Qloo account key, so heavy use counts against your own quota." },
  { id: "cdc", term: "CDC", meaning: "The Centers for Disease Control and Prevention, the US national public health agency." },
  { id: "cdc-places", term: "CDC PLACES", meaning: "Free CDC data that estimates health measures, like high blood pressure, for every US neighbourhood. The numbers come from a national survey and statistical models, not from counting patients." },
  { id: "census-tract", term: "Census tract", meaning: "A small neighbourhood area used by the US Census, usually 1,200 to 8,000 people." },
  { id: "chw", term: "Community health worker", meaning: "A trained person from the community who helps neighbours get health care." },
  { id: "controlled", term: "Controlled blood pressure", meaning: "When someone with high blood pressure has it back in a healthy range, usually with medicine." },
  { id: "evidence", term: "Evidence (trace)", meaning: "The record of every data request behind a result, so anyone can check where it came from." },
  { id: "explainability", term: "Explainability", meaning: "A plain reason for why a result was chosen." },
  { id: "geojson", term: "GeoJSON", meaning: "A common file format for map data, which opens in most map tools." },
  { id: "heatmap", term: "Heatmap", meaning: "A map that uses colour to show where something is stronger or weaker." },
  { id: "hypertension", term: "High blood pressure (hypertension)", meaning: "Blood pressure that stays too high, 130/80 or above under current US guidelines. It often has no symptoms." },
  { id: "ics", term: "ICS file", meaning: "A calendar file that adds events to Google Calendar, Outlook or Apple Calendar." },
  { id: "mcp", term: "MCP (Model Context Protocol)", meaning: "A standard way for AI assistants to use outside tools." },
  { id: "osm", term: "OpenStreetMap", meaning: "A free, public map of the world made by volunteers. Anchor uses it to confirm places are real." },
  { id: "outreach", term: "Outreach", meaning: "Taking health services to people, instead of waiting for them to come in." },
  { id: "qloo", term: "Qloo", meaning: "A company whose taste data shows what groups of people love across music, film, food, places and more, without personal data." },
  { id: "rct", term: "Randomised trial", meaning: "A study where people or places are put into groups by chance. It is the fairest way to test whether something works." },
  { id: "small-cell", term: "Small-cell rule", meaning: "Hiding counts from 1 to 10, so small groups of people cannot be identified." },
  { id: "systolic", term: "Systolic blood pressure", meaning: "The first, higher number in a blood pressure reading, for example the 120 in 120/80." },
  { id: "taste-graph", term: "Taste graph", meaning: "Qloo's map of how people's likes connect across music, film, food, places and more." },
  { id: "zone", term: "Zone", meaning: "A group of nearby high-need neighbourhoods, about the size one outreach team can cover." },
];
