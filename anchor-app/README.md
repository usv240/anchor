# Anchor

**Find the barbershops of every community.**

Live: https://anchor-gamma-woad.vercel.app

Anchor maps where high blood pressure goes uncontrolled, finds the places those neighbours already love and trust, and hands health workers a ready-to-walk outreach plan for them.

When pharmacists met men in their barbershops, **63.6%** got their blood pressure under control, against **11.7%** with usual care (*New England Journal of Medicine*, 2018). A follow-up study reports the programme never spread beyond that trial. Anchor finds where it should go next, for any group of residents, using CDC data for need and Qloo's taste data for trust.

## Results (measured with live Qloo and Claude, 16 requests, `npm run eval`)

| Measure | Anchor | AI alone (same model, no tools) | Map search: barbershops and salons | Qloo without need data |
|---|---|---|---|---|
| Places in the highest-need fifth of neighbourhoods | **100%** | 61% | 18% | 7% |
| Average need of those neighbourhoods (0 to 1) | **0.93** | 0.77 | 0.45 | 0.30 |
| Bars, liquor stores and similar | **0%** | 0% | 0% (any business: 5.1%) | 13.7% |
| Places confirmed in a city licence or a Qloo listing | **100%** | 41% | 100% | 100% |
| Overlap between lists for different audiences (lower means more tailored) | **11.5%** | 36.5% | n/a | n/a |
| Fan reach: share of a Qloo place's 20 strongest fan areas that are high need (chance: about 20%) | **33.5%** | n/a | n/a | 17.8% |

Safety tests (35, all passing): 20 of 20 requests to target by race, ethnicity, religion or origin planned by need instead; 5 of 5 look-alike ordinary requests left alone; 5 of 5 requests for bars held; 5 of 5 requests for medical advice declined by the real Claude agent, graded by a word check and a separate judge call. Honesty notes: the targeting guard was fixed after its first run missed one prompt, and the medical word check was made sentence level after it failed two correct refusals. Both are recorded in `eval/`.

What Qloo cannot do here, measured: it returned 0 small barbershops or salons in the top zone, where 60 are licensed. So half of each plan comes from city licences (the trial's venue type) and half from places Qloo shows each audience loves. 64% of those loved places also match a city licence. Details: [docs/kill-tests.md](docs/kill-tests.md).

## What works today

| Part | Status |
|---|---|
| Landing page, how it works, proof, research, developers, judges, safety, glossary | Built. Light and dark, phone and desktop, info buttons, Simple/Technical switch |
| App: settings, live agent steps, ranked list in two groups, map with taste-map layer, place details with evidence and audience chart, reading corner, downloads | Built |
| Need layer: all 2,474 Los Angeles County census tracts from CDC PLACES, 185 high-need zones | Built, real data |
| Venues: licensed shopfronts inside high-need neighbourhoods (City of LA licences), sole traders and non-shopfronts removed | Built, real data |
| Ranking by a published formula, diversity rules, visit schedule | Built |
| Claude agent (Claude Opus 5.5, strict tools, server-side fallback), with a basic planner fallback | Live |
| Qloo layer: places each audience loves, audience charts, taste map, talking points, children's books | Live |
| Official Qloo harness (MCP) as a backup route and cross-check (40 of 40 values identical) | Live |
| REST API with OpenAPI 3.1, API keys, demo key, rate limits, bring your own Qloo key | Built |
| Exports: CSV, GeoJSON, ICS calendar, JSON, share links, printable reading list | Built |
| Tamper-evident evidence log with a verify endpoint | Built |
| MCP server for Claude and other AI assistants (`scripts/mcp.mts`): need map, plan, get plan, fan reach, reading corner | Built, all 5 tools tested with a real MCP client |
| Evaluation harness, AI-alone baseline and 35-case red-team set | Built and run |
| Bring your own data: upload a partner list, see which partners reach high-need areas, and they come first in the plan | Built |
| Owner invitation letter for each place, from the plan's own schedule, need numbers and Qloo talking points | Built |
| Second county: San Francisco, from its public business register (100% of places in high-need areas, against 18% for a map search) | Built |
| Share links that rebuild the plan if the server has forgotten it; daily allowance on the shared keys | Built |

## Run it

Requires Node.js 24. The data pipeline also needs Python 3.12 and [uv](https://docs.astral.sh/uv/).

```bash
npm install
cp .env.example .env.local     # optional: QLOO_API_KEY, ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

Without keys the app runs in offline mode and says so on every plan.

| Command | What it does |
|---|---|
| `npm run check` | Type check, lint and 260 tests |
| `npm run eval` | Rerun every published number (uses the private Qloo cache if present) |
| `npx tsx scripts/baseline-ai.mts` then `scripts/baseline-ai-check.mts` | Rerun the AI-alone baseline (16 model calls, then Qloo lookups). Needs both keys |
| `npx tsx scripts/redteam-medical.mts` | Rerun the 5 medical-advice tests through the real agent. Needs `ANTHROPIC_API_KEY` |
| `npm run kill-test` | Day-1 test: does Qloo know South LA's licensed barbers and salons? Needs `QLOO_API_KEY` |
| `npm run data` | Rebuild Los Angeles data from source (CDC, Census, City of LA). San Francisco: `bash eval/pipeline/fetch_data.sh 06075`, then `build_need.py` and `build_venues.py` with `--county 06075` |
| `npx tsx scripts/mcp.mts` | Start the MCP server (set `ANCHOR_URL` and `ANCHOR_API_KEY`) |

## How Anchor uses Qloo

| Qloo capability | Use in Anchor | Status |
|---|---|---|
| Place insights in a zone polygon, with age and gender signals | The places a group loves in each high-need zone, re-ranked by that group's affinity | Live |
| Demographic insights | "Who loves this place" chart on every Qloo place | Live |
| Heatmap | Taste map next to the need map | Live |
| Heatmap with one place as the signal | Fan reach on every Qloo place: does it draw people from high-need areas? | Live, harness backup |
| Taste analysis (tags) | Talking points for the top zone | Live, harness backup |
| Book insights from kids' interests, filtered to children's genres, with explainability | Reading corner in barbershops and salons, each book checked with Open Library; says which interests shaped no books | Live |
| Entity and tag search | Real Qloo ids only; also used to check the AI-alone baseline | Live |
| Official Qloo harness (MCP) | Backup routes for audience charts, fan reach and talking points, and a cross-check of Anchor's client (40 of 40 values identical) | Live, backup |
| Audiences, explainability on places, trending, compare, harness recommend and rank | Tested: no useful effect for this use, or not available for places. Probe: `scripts/qloo-probe-routes.mts` | Tested, not used |
| Parameter guard, cache, call budget, rate limit | Refuses parameters Qloo would silently ignore; at most 4 requests a second | Live |

## Data and licences

| Source | Licence |
|---|---|
| CDC PLACES 2025 release (data.cdc.gov `yjkw-uj5s`) | US government, public domain |
| US Census cartographic boundary files, 2023 | Public domain |
| City of Los Angeles Office of Finance, Listing of Active Businesses (`6rrh-rzua`) | CC0 1.0 |
| City and County of San Francisco, Registered Business Locations (`g8m3-pdis`) | ODC Public Domain Dedication |
| Qloo | Used under the hackathon terms. No Qloo responses are stored in this repository. |

Private individuals are never listed: licences under a person's own name without a trading name (976), apartment addresses and mobile services (90) are removed before planning.

Code: MIT, see [LICENSE](LICENSE). Full design documents: [`../anchor`](../anchor). Research voices and references: `src/content/landing.ts`.
