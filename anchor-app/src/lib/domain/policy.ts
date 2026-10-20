/**
 * Targeting policy (anchor/TECHNICAL_DESIGN.md section 8.1).
 * Anchor plans by neighbourhood need, age and gender only. Requests that ask
 * to target people by race, ethnicity, religion, national origin or
 * immigration status are not refused outright: they are reframed to a
 * need-based plan, with one friendly sentence explaining why.
 *
 * This is a deterministic first line of defence used in every mode. In agent
 * mode the model also follows the same rule in its system prompt.
 */

const PROTECTED_TERMS = [
  // race and ethnicity
  "black",
  "african american",
  "african-american",
  "white",
  "caucasian",
  "latino",
  "latina",
  "latinx",
  "latine",
  "hispanic",
  "mexican",
  "salvadoran",
  "guatemalan",
  "asian",
  "chinese",
  "korean",
  "filipino",
  "vietnamese",
  "japanese",
  "indian",
  "armenian",
  "middle eastern",
  "arab",
  "native american",
  "indigenous",
  "pacific islander",
  "race",
  "racial",
  "ethnic",
  "ethnicity",
  "minority",
  "minorities",
  "people of color",
  "poc",
  // religion
  "muslim",
  "jewish",
  "christian",
  "catholic",
  "hindu",
  "sikh",
  "buddhist",
  // origin and status
  "immigrant",
  "immigrants",
  "undocumented",
  "illegal",
  "migrant",
  "migrants",
  "refugee",
  "refugees",
  "foreign",
  "foreigners",
];

// National origin phrased as "from <place>" ("people from Mexico"). Kept to "from ..." so that
// neighbourhood names such as Little Armenia or Thai Town are not treated as targeting.
const ORIGINS = [
  "mexico",
  "el salvador",
  "guatemala",
  "honduras",
  "nicaragua",
  "central america",
  "latin america",
  "south america",
  "africa",
  "asia",
  "china",
  "korea",
  "the philippines",
  "vietnam",
  "japan",
  "india",
  "armenia",
  "iran",
  "the middle east",
  "europe",
  "abroad",
  "overseas",
  "another country",
  "other countries",
];

const PATTERN = new RegExp(
  `\\b(${PROTECTED_TERMS.map((t) => t.replace(/[-]/g, "[- ]?")).join("|")})\\b|\\b(from (?:${ORIGINS.join("|")}))\\b`,
  "i",
);

export const REFRAME_MESSAGE =
  "Anchor plans by neighbourhood need, age and gender, not by race, ethnicity, religion or immigration status. Here is a plan for the highest-need neighbourhoods instead.";

export function checkTargeting(text: string | undefined): { reframed: boolean; matched?: string } {
  if (!text) return { reframed: false };
  const m = PATTERN.exec(text);
  return m ? { reframed: true, matched: (m[1] ?? m[2]).toLowerCase() } : { reframed: false };
}

/** Phrases a model might produce that tie a venue to a protected group. Checked on all output text. */
export function mentionsProtectedGroup(text: string): boolean {
  return PATTERN.test(text);
}
