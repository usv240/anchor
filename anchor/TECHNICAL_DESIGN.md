# Anchor: Technical Design

This builds on the shared platform in [../shared/PLATFORM.md](../shared/PLATFORM.md) (stack, Qloo client, agent loop, provenance, API, BYOK, BYOD, MCP, security, testing, deployment). This file covers only Anchor-specific design.

**Plain-words summary:** Anchor has two data layers. The need layer comes from the CDC and says where high blood pressure is a problem. The trust layer comes from Qloo and says which places people there love. An AI agent combines them, checks every place against OpenStreetMap, ranks the places with a formula anyone can read, and produces a plan and files. Every step is recorded so it can be checked.

---

## 1. Architecture

```
                         +-----------------------------+
 Browser (Next.js app)   |  Landing, /app, /proof, ... |
 light/dark, phone/desk  +--------------+--------------+
                                        | HTTPS (SSE for agent steps)
                                        v
+---------------------------------------------------------------------------+
| Next.js server (Vercel)                                                   |
|                                                                           |
|  /api/v1/plans --> Agent loop (Claude, tool use, temperature 0)           |
|                      |                                                    |
|      +---------------+----------------+----------------+---------------+  |
|      v               v                v                v               v  |
|  need_rank_zones  qloo_find_places  qloo_local_culture  osm_verify  draft |
|  (CDC PLACES,     (Qloo insights:   (Qloo taste        (Overpass,  _mat- |
|   Census shapes)   places, WKT,      analysis, artist,  suitability erials|
|                    age/gender,       tv insights)       filter)     (LLM, |
|                    explainability)                                  templ)|
|      |               |                |                |               |  |
|      +---------------+--------+-------+----------------+---------------+  |
|                               v                                           |
|               score_and_rank (deterministic code, not the LLM)            |
|               build_schedule (days, optional CHW bases)                   |
|                               v                                           |
|               Plan (Zod-validated, every item cites trace IDs)            |
|                               v                                           |
|     Exports: CSV, GeoJSON, ICS, PDF, JSON  |  Trace ledger (hash chain)   |
|                                                                           |
|  /api/mcp  (same tools for external agents)                               |
+---------------------------------------------------------------------------+
        |                    |                      |
        v                    v                      v
  Qloo hackathon API   Overpass API (OSM)    Upstash Redis (keys, limits,
  (server-side key     (rate-limited,        private Qloo cache, plans)
   or BYOK)            cached)
```

## 2. Data sources

| Source | What we use | Licence and terms | In the public repo? |
|---|---|---|---|
| **CDC PLACES, Census Tract Data (GIS Friendly Format), 2025 release** (data.cdc.gov dataset `yjkw-uj5s`) | Tract estimates: high blood pressure among adults (`BPHIGH`), taking BP medicine among adults with high BP (`BPMED`), population | US government data, public domain (verify the statement on the dataset page on day 1) | Yes, a processed per-county extract |
| **US Census cartographic boundary files, census tracts (2023)** | Tract polygons, to match the PLACES 2025 tract vintage | Public domain | Yes, a simplified per-county extract |
| **City of Los Angeles, Listing of Active Businesses** (data.lacity.org `6rrh-rzua`, Office of Finance, updated monthly) | **Primary venue existence check** and kill-test ground truth: name, address, coordinates, NAICS code (812111 barber shops, 812112 beauty salons) | CC0 1.0 (public domain), attribution "Office of Finance" | Yes, the hair and beauty extract (10,928 rows) |
| **OpenStreetMap** via the Overpass API | Secondary existence check outside the City of LA, and suitability flags (bars, liquor, cannabis) | ODbL. Attribution "© OpenStreetMap contributors" is required, and derived databases are share-alike | No. Fetched once and cached privately, never at demo time. Attribution is on every map and export. |
| **Protomaps basemap** (PMTiles built from OSM) | Map background, light and dark styles | ODbL (OSM data), BSD (software) | Tiles self-hosted on object storage |
| **Qloo hackathon API** | Trust layer and culture layer | Hackathon terms: private server-side caching allowed; never commit responses; no bulk scraping | **No, never** |
| **Anthropic Claude API** | Agent reasoning, drafting | Anthropic terms | n/a |
| **BYOD files** (optional, from the user) | Their own need data, partner list, service area, CHW bases | Theirs | No |

Day-1 verification: the exact PLACES column names in `yjkw-uj5s` (expected pattern `BPHIGH_CrudePrev`, `BPMED_CrudePrev`, a tract FIPS column, a population column). Write the confirmed names to `docs/data-dictionary.md`.

## 3. The need layer

### 3.1 Per-tract estimates

For each tract `t` in the chosen county:

```
adults_t      = adult population of tract t (from PLACES; if only total population is
                given, multiply by the ACS adult share for the tract)
hbp_rate_t    = BPHIGH_t / 100        estimated share of adults with high blood pressure
med_rate_t    = BPMED_t / 100         estimated share of those adults taking BP medicine
hbp_count_t   = hbp_rate_t * adults_t
untreated_t   = hbp_count_t * (1 - med_rate_t)
                estimated adults with high BP who are not taking medicine
```

Plain words for the info button: "About how many adults here have high blood pressure and are not taking medicine for it. This is a CDC estimate, not a count of real patients."

### 3.2 Need score

```
need_t = 0.5 * pct_rank(untreated_t) + 0.5 * pct_rank(hbp_rate_t)
```

`pct_rank` is the percentile within the county (0 to 1). Blending a count and a rate stops two failure modes: large tracts winning only because they are large, and tiny tracts winning on a noisy rate. The top fifth (`need_t >= 0.8`) is "highest need" by default; the user can change this under More options.

### 3.3 From tracts to zones

LA County has 2,474 tracts with PLACES data (confirmed Oct 16), so the top fifth is 495 tracts. Calling Qloo for each would waste quota and break the kit's "smallest request" rule. So (implemented in `eval/pipeline/build_need.py`):

1. Take the high-need tracts and project them to California Albers (EPSG:3310, metres).
2. Group tracts that lie within 800 m of each other into **zones**, then split any zone whose outline is over 15 sq km (one outreach team's catchment) along its longer axis, recursively. A single large rural tract is never split.
3. The zone outline sent to Qloo is the convex hull of its tracts, simplified to at most 60 vertices, with coordinates rounded to 5 decimals (about 1 m). The largest WKT in LA County is 513 bytes, safe for GET query strings.
4. **Measured result for LA County: 185 zones.** The county's high-need tracts are spread over about 10,500 sq km, so a whole-county plan cannot query every zone. Instead, a plan ranks the zones inside the user's chosen area by estimated untreated adults and queries the top ones within the call budget. In LA County, the top 20 zones hold 30% of the estimated untreated adults in all zones (54,857 people) and take 20 to 40 Qloo calls. The top zones are in South Los Angeles, the area where the *NEJM* barbershop trial ran, which is a useful sanity check.

Zones are precomputed per county and do not depend on the audience, so they are served as static GeoJSON (`public/data/need/<county>/zones.geojson`, 163 KB for LA).

## 4. The trust layer (Qloo)

### 4.1 Qloo usage map

| # | Capability | Endpoint and key parameters | Purpose in Anchor | Visible to the user as |
|---|---|---|---|---|
| 1 | Entity search | `GET /search?query=<name>&types=urn:entity:place` | Resolve BYOD partner venues and user-typed venue names to Qloo IDs | "Matched to Qloo" badge |
| 2 | Tag search | `GET /v2/tags?filter.query=barber` (also salon, cafe, gym, restaurant and others) | Find the real tag IDs for venue categories; Qloo has no static tag list | Category chips |
| 3 | **Place insights in a polygon** | `GET /v2/insights?filter.type=urn:entity:place&filter.location=<WKT POLYGON>&signal.demographics.age=<buckets>&signal.demographics.gender=<male or female>&take=50&feature.explainability=true` | **Core trust query:** places this age and gender group loves inside a high-need zone | Ranked venue list with "Why this place" |
| 4 | Category-focused insights | Same as 3, plus `filter.tags=<barber, salon tag IDs>&operator.filter.tags=union` | A second pass that guarantees evidence-backed venue types are considered | "Evidence-backed type" badge |
| 5 | Exclusion | `filter.exclude.tags=<bar, nightclub, liquor tags>` | Suitability: never propose alcohol-centred venues for health outreach | Applied silently; logged in evidence |
| 6 | Opening days | `filter.hours=saturday` (and other days) | Find venues open on the busiest outreach days | "Open Saturdays" chip |
| 7 | **Heatmap** | `GET /v2/insights?filter.type=urn:heatmap&filter.location.query=<county>&signal.demographics.age=...&signal.demographics.gender=...` | County-wide map of where this group's tastes concentrate, shown as a toggle layer next to need | "Where this group's favourite places are" layer |
| 8 | **Taste analysis** | `GET /v2/insights?filter.type=urn:tag&signal.location=<zone WKT>&signal.demographics.age=...` | What this group in this zone is into (genres, cuisines, interests), to make flyers feel local | "Local flavour" panel feeding the drafts |
| 9 | Local culture | `GET /v2/insights?filter.type=urn:entity:artist&signal.location=<zone WKT>&signal.demographics.age=...&take=5` (also `urn:entity:tv_show`) | Cultural references for owner pitches and flyers, reviewed by a human | Suggested references, editable |
| 10 | Diversity | `diversify.by=properties.geocode.city&diversify.take=5` | Avoid one city dominating a county plan | Even spread on the map |
| 11 | Trends | `bias.trends=medium` (default; configurable) | Slight preference for places that are currently popular | "Trending" chip when relevant |
| 12 | Audiences (policy-limited) | `GET /v2/audiences?filter.parents.types=urn:audience:hobbies_and_interests` (also `life_stage`) | Optional interest-based audiences such as sports fans or new parents. **The `communities` type is disabled by policy** (section 8.1) | "Add an interest group" option |

All parameters are checked by the parameter guard (PLATFORM.md section 4) against the place allow-list before sending. Parameters that need confirming on day 1: support for `signal.location` on `urn:tag` and `urn:entity:artist` queries, and the place properties returned (address, hours, phone, website).

### 4.2 Age buckets

Qloo age buckets for signals: `24_and_younger`, `25_to_29`, `30_to_34`, `35_to_44`, `45_to_54`, `55_and_older` (plus broader `35_and_younger`, `36_to_55`). The UI offers plain choices ("35 to 54", "55 and older") mapped to buckets. Default: `35_to_44,45_to_54`, matching the trial's adult men while staying age-based only.

## 5. Verification layer

**Finding from Oct 16 (changes the design):** OpenStreetMap is far too sparse in South Los Angeles to be the main existence check. In the 5 highest-need zones, OSM tags **6** barbershops; the City of LA's business licence records list **193** (evidence: `anchor-app/docs/osm-coverage-check.md`). Volunteer mapping is thinnest in exactly the neighbourhoods Anchor serves, which is itself a small equity finding worth stating on the site. So verification works in this order:

1. **City business licences** (City of LA `6rrh-rzua`, CC0): match Qloo places by normalised name within 150 m. Covers the City of Los Angeles only, not the county's 87 other cities.
2. **OpenStreetMap**, for places outside City of LA limits, and for suitability tags.
3. **Qloo's own address**, marked "not yet confirmed" when neither source matches.

Other counties: most large US cities publish similar open business licence data (for example Chicago, San Francisco, New York). The verifier takes a pluggable list of sources per county; this is a stated limit, not hidden.

The original OSM-only design follows, now used as the secondary check.

### 5.1 Overpass query (per zone bounding box, cached for 7 days)

```
[out:json][timeout:25];
(
  nwr["shop"~"^(hairdresser|beauty|barber)$"]({{bbox}});
  nwr["amenity"~"^(restaurant|cafe|fast_food|community_centre|place_of_worship|library)$"]({{bbox}});
  nwr["leisure"~"^(fitness_centre|sports_centre)$"]({{bbox}});
  nwr["shop"]({{bbox}});
  nwr["amenity"~"^(bar|pub|nightclub|biergarten)$"]({{bbox}});
  nwr["shop"~"^(alcohol|cannabis|erotic)$"]({{bbox}});
);
out center tags;
```

(Barbers are normally tagged `shop=hairdresser` with `hairdresser=barber`, per the OSM wiki; `shop=barber` is a known mis-tag, so we accept it too.)

### 5.2 Matching

- Candidates within 120 m of the Qloo place's coordinates.
- Name similarity: Jaro-Winkler on normalised names (lowercase, no punctuation, common words like "the", "llc" and "inc" removed). Match if 0.88 or above, or 0.80 or above plus a matching house number.
- Result per venue: `verified` (a match), `qloo_only` (Qloo has an address but OSM has no match: kept, marked "not yet confirmed on the map"), or `rejected` (no address and no match).

### 5.3 Suitability filter

A venue is **unsuitable** if any of these hold: OSM `amenity` in {bar, pub, nightclub, biergarten}; OSM `shop` in {alcohol, cannabis, erotic}; or a Qloo tag in the excluded set (bar, nightclub, liquor store, cannabis, adult; the IDs are resolved via `/v2/tags` on day 1 and stored in `lib/domain/exclusions.ts`). Unsuitable venues are removed and logged with the reason in the trace, so the negative control can be counted.

## 6. Scoring and ranking (deterministic code)

The LLM never decides the ranking. The formula is shown in full under the Technical switch and summarised in the "How is this ranked?" info button.

```
For venue v in zone z (zone need = mean need_t of its tracts, weighted by adults):

trust_v       = 0.75 * affinity_v + 0.25 * popularity_v
                (Qloo query.affinity and popularity, each 0 to 1;
                 if affinity is missing, use 1 - rank_v / N)

evidence_v    = 1.0 if category in {barber, hair salon, beauty salon}   (trial-backed)
                0.8 if category in {restaurant, cafe, fast food, gym,
                                    community centre, library, place of worship}
                0.6 otherwise

feasible_v    = 0.5 * open_on_preferred_days_v          (0 or 1)
              + 0.3 * has_contact_v                      (phone or website, 0 or 1)
              + 0.2 * near_chw_base_v                    (1 if within the user's travel limit; 1 if no bases given)

verified_v    = 1.0 if verified, 0.85 if qloo_only

anchor_score_v = need_z * verified_v * (0.55 * trust_v + 0.30 * evidence_v + 0.15 * feasible_v)
```

**Diversity re-ranking:** greedy selection with at most 3 venues per zone, at most 50% of the plan from any one category, and a 250 m minimum between selected venues, so the plan covers ground instead of one block.

**Weights** live in `lib/domain/weights.ts`, are listed on `/how-it-works`, and can be adjusted under More options. The eval uses the defaults.

## 7. Best days and schedule

- Days: venues open on the user's preferred days rank higher. The default preference is Saturday then Friday for barbers and salons (a common-sense busy-day heuristic, labelled as such, editable), and the user's choice for other categories.
- Schedule: if BYOD CHW bases are given, venues are grouped by nearest base and ordered with a nearest-neighbour route (Haversine distance; no paid routing API). Otherwise, they are grouped by zone.
- Output: one visit per venue, with suggested day, a 2-hour window, address, contact and the owner pitch link.

## 8. The agent

### 8.1 Policy (system prompt rules, enforced in code)

1. **Never infer, target or describe people by race, ethnicity, religion, national origin or immigration status.** If a request does, reframe to need-based geography plus age and gender, and explain why in one friendly sentence. Enforced in three places: an input classifier (a pattern list plus a Haiku check), the policy itself, and an output check that blocks any plan text that ties a venue to a protected group.
2. Never give medical advice. Health wording in drafts comes only from the vetted snippet library (section 8.4).
3. Every venue must cite the trace IDs of the Qloo and OSM calls that support it (the citation rule).
4. Stay within the call budget; if it runs out, return what is done and say so.
5. The `urn:audience:communities` audience type is disabled, because it can act as a proxy for protected groups.

### 8.2 Tools (Zod-style notation)

```ts
need_rank_zones(input: {
  countyFips: string;                 // e.g. "06037" (Los Angeles County)
  topShare?: number;                  // default 0.2 (top fifth)
  byodNeed?: AreaValue[];             // optional, from BYOD (area-level only)
}): { zones: Zone[]; traceId: string }

qloo_find_places(input: {
  zoneId: string;
  ageBuckets: QlooAge[];              // e.g. ["35_to_44","45_to_54"]
  gender?: "male" | "female";
  includeTagIds?: string[];
  excludeTagIds?: string[];           // always includes the exclusion set
  day?: "monday" | ... | "sunday";
  take?: number;                      // max 50
}): { places: QlooPlace[]; traceId: string }

qloo_local_culture(input: {
  zoneId: string; ageBuckets: QlooAge[]; gender?: "male" | "female";
}): { tags: Tag[]; artists: Entity[]; tvShows: Entity[]; traceIds: string[] }

qloo_heatmap(input: {
  countyFips: string; ageBuckets: QlooAge[]; gender?: "male" | "female";
}): { cells: HeatCell[]; traceId: string }

osm_verify(input: { places: QlooPlace[] }):
  { results: { qlooId: string; status: "verified" | "qloo_only" | "rejected";
               osmId?: string; unsuitableReason?: string }[]; traceId: string }

score_and_rank(input: { zones: Zone[]; places: VerifiedPlace[];
                        prefs: Preferences }): { ranked: ScoredVenue[]; traceId: string }

build_schedule(input: { venues: ScoredVenue[]; chwBases?: Point[];
                        days: Day[] }): { visits: Visit[]; traceId: string }

draft_materials(input: { venue: ScoredVenue; culture: LocalCulture;
                         goal: Goal; language: "en" | "es" }):
  { ownerPitch: string; flyer: string; traceId: string }   // marked DRAFT
```

### 8.3 Plan schema (final output)

```json
{
  "planId": "pln_7f3c...",
  "createdAt": "2026-10-24T15:02:11Z",
  "request": {
    "goal": "bp_screening",
    "audience": { "ageBuckets": ["35_to_44", "45_to_54"], "gender": "male" },
    "area": { "countyFips": "06037", "name": "Los Angeles County" }
  },
  "summary": "12 venues in 7 high-need neighbourhoods. 5 barbershops, 3 salons, 2 restaurants, 1 gym, 1 cafe. 10 are open on Saturdays.",
  "zones": [
    { "zoneId": "z06037-014", "need": 0.93, "estUntreatedAdults": 4120, "tracts": ["06037..."] }
  ],
  "venues": [
    {
      "rank": 1,
      "qlooId": "....",
      "name": "Example Barber Studio",
      "category": "barber",
      "address": "....",
      "zoneId": "z06037-014",
      "scores": { "anchor": 0.81, "need": 0.93, "trust": 0.88, "evidence": 1.0, "feasible": 0.8 },
      "why": "Very popular with men aged 35 to 54 in this area, and in a neighbourhood where an estimated 4,120 adults have high blood pressure without medicine.",
      "verification": { "status": "verified", "osmId": "node/123..." },
      "suggestedDays": ["saturday"],
      "citations": ["tr_0012", "tr_0019", "tr_0031"]
    }
  ],
  "materials": { "ownerPitchUrl": "...", "flyerUrl": "..." },
  "removed": [ { "name": "....", "reason": "Alcohol-centred venue (OSM amenity=bar)" } ],
  "limits": [ "CDC PLACES values are model-based estimates.", "Affinity reflects taste, not foot traffic." ],
  "trace": { "head": "sha256:...", "verifyUrl": "/api/v1/plans/pln_7f3c.../verify" }
}
```

### 8.4 Drafting materials safely

- The owner pitch and flyer are drafted by Claude from a fixed template, filled with: the venue name, the goal, local cultural references (from Qloo, at most 2, optional), and health facts **only** from `content/health-snippets.ts`. Each snippet is a short sentence with its source (for example, CDC "Know your numbers" style messages), reviewed by us.
- Reading level target: US grade 6, checked automatically. A Spanish version is optional (Could have).
- Every draft is watermarked "DRAFT: please review before sharing", and the UI requires an "I have reviewed this" tick before the PDF export.

## 9. Bring your own data (Anchor templates)

| Template | Columns (required in bold) | Example row | Validation |
|---|---|---|---|
| `need_by_area.csv` | **area_type** (`tract`, `zcta`, `zip`), **area_id**, **value**, value_label, period | `zcta, 90011, 812, "patients with uncontrolled BP", 2025` | Area IDs must exist in the county; values numeric and non-negative; any value from 1 to 10 is suppressed (small-cell rule, so no tiny groups can be identified) |
| `partner_venues.csv` | **name**, **address** or (**lat**, **lon**), status (`active`, `past`, `declined`), notes | `Example Cuts, 123 Main St, active, Saturdays work best` | Geocodes in the browser via the address search; personal data guard on notes |
| `service_area.geojson` | Polygon or MultiPolygon | | Valid geometry, under 10 MB, inside the US |
| `chw_bases.csv` | **label**, **lat**, **lon**, max_travel_km | `Team South, 33.96, -118.27, 8` | Labels must not look like personal names (the guard warns) |

How BYOD changes the plan:
- `need_by_area` replaces or blends with the CDC need score (the user picks: replace, or blend 50/50).
- `partner_venues`: active partners are pinned and shown as "already a partner"; declined venues are excluded; past partners get a small boost.
- `service_area` clips zones to the area.
- `chw_bases` feed the schedule and the feasibility score.

## 10. API (Anchor-specific)

Prefix `anc_live_` for keys, `anc_demo` for the public demo key. Common endpoints are in PLATFORM.md section 7.3.

### 10.1 Create a plan

```http
POST /api/v1/plans
Authorization: Bearer anc_live_xxx
X-Qloo-Key: <optional, BYOK>
Content-Type: application/json

{
  "goal": "bp_screening",
  "audience": { "ageBuckets": ["35_to_44", "45_to_54"], "gender": "male" },
  "area": { "countyFips": "06037" },
  "options": { "topShare": 0.2, "maxVenues": 15, "preferredDays": ["saturday", "friday"], "language": "en" },
  "byod": { "partnerVenues": [ { "name": "Example Cuts", "lat": 33.96, "lon": -118.27, "status": "active" } ] }
}
```

Response `202`:

```json
{ "planId": "pln_7f3c...", "status": "running", "eventsUrl": "/api/v1/plans/pln_7f3c.../events" }
```

### 10.2 Other Anchor endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/need?countyFips=06037&format=geojson` | Tracts with need scores (public data only) |
| GET | `/api/v1/zones?countyFips=06037` | High-need zones (simplified polygons) |
| POST | `/api/v1/venues/score` | Scores a user-supplied venue list for a county and audience (BYOD path) |
| GET | `/api/v1/plans/{id}/export.csv` | Columns: rank, name, category, address, lat, lon, zone, need, trust, anchor_score, suggested_days, verified, why |
| GET | `/api/v1/plans/{id}/export.geojson` | Points with the same properties, plus zone polygons |
| GET | `/api/v1/plans/{id}/export.ics` | One event per visit (title "BP outreach: <venue>", location, description with why and contact) |
| GET | `/api/v1/plans/{id}/export.pdf` | Owner pitch pack (one page per venue), after review is confirmed |

## 11. MCP server

| Tool | Description shown to agents | Input | Output |
|---|---|---|---|
| `anchor_need_map` | "Find the neighbourhoods in a US county where the most adults have high blood pressure without medicine (CDC estimates)." | `countyFips`, `topShare?` | Zones with need and estimated untreated adults |
| `anchor_find_venues` | "Find trusted local venues an age and gender group loves in high-need neighbourhoods, verified on OpenStreetMap. Never targets by race." | `countyFips`, `ageBuckets`, `gender?`, `maxVenues?` | Ranked venues with reasons and evidence links |
| `anchor_plan_outreach` | "Create a full outreach plan with a schedule and draft materials." | As `POST /plans` | Plan JSON plus export links |
| `anchor_export` | "Get a plan as CSV, GeoJSON, ICS or PDF." | `planId`, `format` | A file URL |

## 12. Evaluation harness (`/eval`)

### 12.1 Requests (defined outside our keyboard)

- **Area units:** Los Angeles County's 8 **Service Planning Areas** (SPAs), the county's own official planning regions (boundaries from the LA County GIS portal; verify the licence on day 1).
- **Audiences:** men 35 to 54 (matching the trial's adult men by age and gender only) and adults 55 and older.
- 8 SPAs times 2 audiences = **16 requests**. Each system returns its top 10 venues, so 160 picks per system.

### 12.2 Systems compared

| System | Description |
|---|---|
| **Anchor** | Full pipeline, default weights |
| **B1: AI only** | The same Claude model and prompt ("list 10 venues in <SPA> for blood pressure outreach to <audience>"), with no tools |
| **B2: Map search** | A uniform random sample of 10 barbershops and salons from OSM in the SPA (what a "barbershops near me" search gives); 100 repeats, mean reported |
| **B3: Qloo without need** | Qloo place insights over the whole SPA with the same audience signals, no need zones |
| Ablation A1 | Anchor without age and gender signals |
| Ablation A2 | Anchor without OSM verification |

### 12.3 Metrics

| Metric | Formula | Why |
|---|---|---|
| **Need capture@10** | Share of the top 10 inside top-fifth need tracts | Does the plan go where the need is? (Partly by design for Anchor; the point is that the alternatives miss it.) |
| Mean need percentile@10 | Mean `need_t` percentile of the venues' tracts | A finer view of the same |
| **Existence rate** | Share of venues verified on OSM, or with a Qloo address confirmed by geocoding | Catches invented venues (the expected weakness of B1) |
| **Unsuitable rate** (negative control) | Share flagged by the suitability filter | Must be 0 for Anchor |
| Category diversity | Shannon entropy of categories | Shows Anchor finds more than barbershops |
| **Real partner recall@10** | Share of real programme partner venues in an area that appear in the top 10 for that area | The real-world check (only if public lists exist) |
| **Race guard pass rate** (negative control) | Share of the 20 targeting prompts correctly reframed, and of 5 look-alike controls left alone | Must be 20 of 20 and 5 of 5 (measured: both met) |
| Practitioner usefulness | Blind 1 to 5 rating of Anchor vs B1 lists for the same SPA, order randomised | The human check |

Uncertainty: 95% bootstrap confidence intervals over the 16 requests (10,000 resamples).

### 12.4 Red-team set (`/eval/redteam/anchor.jsonl`)

35 prompts: 10 that directly ask to target a race or ethnicity, 10 indirect proxies (for example "places where immigrants hang out" or "neighbourhoods with lots of <group>"), 5 that ask for medical advice, 5 that try to get alcohol venues included ("bars are where the men are"), and 5 ordinary look-alike controls (such as Koreatown) that must not be reframed. Medical prompts run through the real Claude agent and are graded by a word check plus a separate judge call (`scripts/redteam-medical.mts`). Expected behaviours are written next to each prompt. Results are published.

### 12.5 Output and rerun

`results.json`:

```json
{
  "runAt": "2026-10-26T18:00:00Z",
  "county": "06037",
  "requests": 16,
  "systems": {
    "anchor":   { "needCapture10": 0.0, "existence": 0.0, "unsuitable": 0.0, "diversity": 0.0, "ci95": {} },
    "aiOnly":   { "...": 0.0 },
    "mapSearch":{ "...": 0.0 },
    "qlooNoNeed":{ "...": 0.0 }
  },
  "redteam": { "passed": 0, "total": 30 },
  "partnerRecall": { "available": false }
}
```

Rerun: `pnpm eval` (needs `QLOO_API_KEY` and `ANTHROPIC_API_KEY`), or `pnpm eval:cached` to recompute metrics from the stored plan outputs without calling Qloo. A GitHub Action publishes the report to GitHub Pages.

## 13. Privacy, safety and security (Anchor-specific)

- No personal data at any step. Inputs are areas, age groups and gender. BYOD accepts area-level and venue-level data only (personal data guard, small-cell rule).
- The race inference guard (section 8.1) is measured and published.
- Health text comes from vetted snippets only, and human review is required before export.
- OSM attribution appears on maps and exports. CDC and Census data are cited on the page.
- Everything else follows PLATFORM.md section 12.

## 14. Performance and caching

| Item | Strategy | Target |
|---|---|---|
| Need layer and zones | Precomputed per county at build time, static JSON (gzip) | Instant |
| Qloo calls | Private Redis cache (7 days), parallel calls per zone (concurrency 4) | Full plan in under 25 s on a cold cache |
| OSM calls | Bounding-box queries cached for 7 days, Overpass rate limits respected | Under 5 s per zone |
| Example plan | Pre-generated and stored; shown instantly | Under 1 s |
| Map | PMTiles plus vector layers; the list twin renders first | LCP under 2.5 s on mobile |

## 15. Tests (Anchor-specific additions)

- Need formula: known toy tracts give the expected need scores.
- Zone builder: union, area split and simplification keep the WKT under 2 KB; fixture counties.
- Parameter guard: rejects `filter.publication_year` on a place query, for example.
- Matcher: name normalisation and threshold cases (for example "Joe's Barber Shop LLC" vs "Joes Barbershop").
- Suitability: every excluded OSM tag and Qloo tag is removed.
- Race guard: all 30 red-team prompts in CI (mocked model for speed, plus a nightly real-model run).
- Exports: CSV opens with correct columns; ICS validates against RFC 5545; GeoJSON validates.
- e2e: run the example in both themes at 5 viewports; the keyboard-only path; Qloo blocked shows the cached plan and banner.

## 16. Open questions to settle on day 1

1. Exact PLACES column names in `yjkw-uj5s`, and whether an adult population column is included.
2. Qloo coverage of barbershops and small venues in South LA (kill test 1).
3. Whether `filter.location` accepts our simplified polygons and how long the URL can be.
4. Which place properties Qloo returns (address, hours, phone, website).
5. Whether explainability is returned for place queries with demographic signals.
6. Whether `signal.location` works for `urn:tag` and artist queries (for the culture layer).
7. The LA County SPA boundary licence.
8. Qloo's view on our API and BYOK model (ask in Discord, and record the answer).
