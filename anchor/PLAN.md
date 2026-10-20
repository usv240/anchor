# Anchor: Project Plan

Deadline: **Oct 30, 2026, 11:45pm EDT**. Internal deadline: **submit by noon EDT on Oct 30.** Judging: Nov 2 to Nov 16, 2026. The demo must stay up and free for that whole period.

---

## 1. Goal and success criteria

**Goal:** a public, working agent that turns "who do we want to reach, and where" into a verified, ranked, ready-to-use outreach plan of trusted local venues, with proof that it beats simpler approaches.

| Success measure | Target | How it is checked |
|---|---|---|
| Need targeting: share of recommended venues inside the highest-need fifth of tracts | Higher than both baselines (expected 80%+ vs about 40% for a plain map search) | `pnpm eval` on Los Angeles County |
| Venue existence: share of recommended venues confirmed real on OpenStreetMap or Qloo with an address | 100% for Anchor; we report the LLM-only rate side by side | Eval harness |
| Unsuitable venues (bars, liquor stores, cannabis shops, adult venues) | 0 | Eval harness, OSM tags plus Qloo tags |
| Race inference refusals on a 35-prompt red-team set | 20 of 20 reframed to need, 5 of 5 look-alike controls left alone, 5 of 5 alcohol, 5 of 5 medical (measured Oct 20) | Red-team scripts |
| Real partner recall: real programme venues appearing in Anchor's top results for their area | Report the number honestly, whatever it is | Only if public partner lists exist (kill test 4) |
| Practitioner voice | At least 1 quoted health worker, health department or barbershop programme lead | Outreach (section 7) |
| Accessibility and performance | 0 axe violations; Lighthouse 95+ on mobile | CI reports |
| Reliability | The demo works with Qloo blocked | Playwright test |

## 2. Reaching the ceiling on each judging criterion

Judging criteria are equally weighted. Ties are broken in this order, so it is also our investment order.

### 2.1 Technological Implementation (first tie-breaker)

| What a judge looks for | What we ship | Where they see it |
|---|---|---|
| Thorough, skilled use of Qloo | 8 Qloo capabilities each doing visible work: `/search`, `/v2/tags`, insights for places with **WKT polygons** and **age/gender signals**, **explainability**, **heatmap**, **taste analysis** (`urn:tag`) for messaging, **artist and TV insights** for cultural references, **audiences**, plus `filter.hours` and `diversify` | `/judges` Qloo usage map, every result's "Show evidence" |
| Non-trivial implementation | Agent with schema-checked plans and a citation rule; a CDC need layer with polygon simplification; an OSM verifier with fuzzy matching; a scoring model; exports; REST API; MCP server; hash-chained provenance | Repo, architecture doc |
| Genuine effort | CI with unit, e2e, accessibility, Lighthouse and eval checks; test count on the README | GitHub Actions badge |

### 2.2 Design

| What a judge looks for | What we ship |
|---|---|
| Complete product, not a proof of concept | Landing page, app, judge mode, proof page, research page, developer page, safety page, glossary; exports that open in Excel, Google Calendar and GIS tools |
| Coherent experience | One design system, light and dark, phone and desktop, Simple/Technical switch, info buttons on every feature, guided tour, example pre-loaded |
| Polish | Lighthouse 95+, WCAG 2.2 AA, 44 px touch targets, map with an accessible list twin |

### 2.3 Potential Impact

| What a judge looks for | What we ship |
|---|---|
| Real problem, real audience | 120 million adults, 22.5% controlled, 680,179 deaths (CDC). Named users: CHWs and health department outreach leads |
| Credible, specific case | Built on the *NEJM* barbershop trial; a clear statement of what the evidence does and does not show |
| The solution addresses it, as demonstrated | Eval numbers vs baselines; voices from the field taken from published research; a real plan for a real county |
| Path to adoption | Buyers: health departments, Medicaid health plans (HEDIS "Controlling High Blood Pressure"), hospital community benefit teams, pharmacy chains. Grows to cancer screening, vaccines, HIV prevention, diabetes |

### 2.4 Quality of the Idea

| What a judge looks for | What we ship |
|---|---|
| Creative, non-obvious use of Qloo | Taste data as public health infrastructure; no prior Qloo project does this (collision check) |
| Understanding of the problem space | We cite the research gap, the limits of CDC estimates, the difference between affinity and foot traffic, and the ethics of targeting (no race inference) |

## 3. Winner patterns: status and hours to fix

| # | Pattern | Status now | Plan | Hours |
|---|---|---|---|---|
| 1 | Two numbers | Planned | Need targeting on LA County (benchmark) plus a live second-county run with real partner recall | 10 |
| 2 | External cases | Planned | CDC PLACES, Census tract shapes, OSM, real programme partner lists | 6 |
| 3 | Named baseline beaten | Planned | LLM-only planner; Map baseline (all barbershops and salons in the area, by rating); Qloo without the need layer | 6 |
| 4 | Negative control as headline | Planned | 0 race inferences, 0 unsuitable venues, 0 invented venues | 4 |
| 5 | Loop closes | Planned | CSV, GeoJSON, ICS, PDF owner pitch, partner tracker, API, MCP | 8 |
| 6 | Depth on one surface | By design | All depth in Qloo, one county done properly | n/a |
| 7 | Verb-chain tagline | Done | See section 8 | 0 |
| 8 | Unbreakable demo | Planned | Cached LA example, Qloo-down test | 3 |
| 9 | Practitioner voice | **Missing** | Outreach today (section 7) | 2 of our time, days of waiting |
| 10 | Shipped surface | Planned | Web app, installable PWA, API, MCP | 6 |
| 11 | Measured limits | Planned | Qloo coverage of OSM barbershops; CDC estimate caveat; affinity vs foot traffic | 2 |
| 12 | Inspectable and rerunnable | Planned | `pnpm eval`, trace verify endpoint, GitHub Pages report, MIT | 4 |

Cheapest first: 7, 11, 8, 4, 12, 2, 3, 6, 10, 5, 1. **Pattern 9 was revised on Oct 20: published research replaces a practitioner quote (see section 7).**

## 4. Scope

| Must have (submission fails without it) | Should have (big score gain) | Could have (if time) | Won't have (this round) |
|---|---|---|---|
| Landing page with all 13 sections | Judge mode `/judges` | Second-county live run with a different region | User accounts |
| App: inputs, agent steps, map and list, venue cards with why and evidence | REST API with keys and demo key | Spanish-language owner pitches and flyers | Real-time foot traffic data |
| CDC need layer for LA County | MCP server (remote) | Heatmap overlay toggle | Any medical advice or patient data |
| Qloo trust layer with explainability | BYOD upload (own need data, own partner list, service area) | Partner tracker sync to Google Sheets | Paid tiers |
| OSM verification and suitability filter | BYOK | Installable PWA offline mode | |
| Race inference guard | Owner pitch PDF and flyer text | | |
| Exports: CSV, GeoJSON, ICS | Proof page with eval results | | |
| Eval harness with 3 baselines and red-team set | GitHub Pages eval report | | |
| Light and dark, mobile and desktop, info buttons, Simple/Technical switch | Guided tour | | |
| Public repo, MIT licence, README, JUDGES.md | | | |

## 5. Schedule

| Date | Work | Done when |
|---|---|---|
| **Thu Oct 16** | Request the Qloo API key (if not done). Download CDC PLACES 2025 tract data and 2023 Census tract shapes for LA County. Search for public partner-venue lists. Scaffold the repo (Next.js, Tailwind tokens, CI, LICENSE). | Key requested; data in `/data/public`; CI green |
| Fri Oct 17 | Kill tests 1 to 3 (section 6). Qloo client with parameter guard, cache, trace. Need layer: tract scoring, polygon simplification. | Kill test results written to `docs/kill-tests.md` |
| Sat Oct 18 | OSM verifier (Overpass), suitability filter, fuzzy matcher. Landing page skeleton with real copy. | Verifier unit tests pass |
| Sun Oct 19 | Agent tools and loop; Plan schema; citation rule; race inference guard. | Agent produces a valid plan for LA from the CLI |
| Mon Oct 20 | Scoring model; best-days logic; messaging tools (taste analysis, cultural references); owner pitch and flyer drafts. | Plan has scores, days and drafts |
| Tue Oct 21 | App UI: inputs, agent steps panel (SSE), map and list twin, venue cards, evidence viewer. | Run end to end in the browser |
| Wed Oct 22 | Exports (CSV, GeoJSON, ICS, PDF); BYOD upload with validation and personal data guard; BYOK. | Exports open in Excel, Google Calendar and QGIS |
| Thu Oct 23 | REST API, OpenAPI spec, developer page, API keys, rate limits; MCP server. | Claude Desktop can call `anchor_find_venues` |
| Fri Oct 24 | Eval harness: baselines, metrics, red-team set. First full run. | `results.json` produced |
| Sat Oct 25 | Proof page, judges page, safety page, glossary, research page; info button content; guided tour. | Every info button has content; content lint passes |
| Sun Oct 26 | Second-county live run; partner recall (if lists exist). | Two numbers ready |
| Mon Oct 27 | Accessibility and performance pass (axe, Lighthouse, screen reader); dark mode and 5-viewport screenshots. | 0 axe violations; Lighthouse 95+ |
| Tue Oct 28 | README, JUDGES.md, eval report on GitHub Pages; Devpost draft; gallery images. | Drafts reviewed |
| Wed Oct 29 | Freeze. Bug fixes only. Run the submission checklist (`shared/RULES_COMPLIANCE.md` section 5). Spend caps and uptime monitor. | Checklist complete |
| **Thu Oct 30** | Final check in a private window and on a phone. **Submit by noon EDT.** | Submitted |

## 6. Risks and day-1 kill tests

| # | Risk | Kill test | Pass if | If it fails |
|---|---|---|---|---|
| 1 | Qloo has few barbershops or small local businesses | `npx tsx scripts/kill-test.ts 5`: compare Qloo place results in the top 5 zones with **City of LA business licences** (341 licensed barbers and salons there). OSM was dropped as ground truth on Oct 16 (only 6 barbershops tagged vs 193 licensed). | Qloo knows at least 50% of licensed barbers and salons (strict name match; hand-check 20 misses) | Switch to Hooked (kids' reading). The decision is made the day the key arrives. **Ground truth is built and the script is ready; it only needs the key.** |
| 2 | Polygon plus age and gender signals don't change rankings | Same query with and without signals; compare top 20 | Rank correlation below 0.8 (signals matter) | Use the heatmap plus a radius around tract centroids |
| 3 | Explainability is empty for place queries | `feature.explainability=true` on 10 queries | Non-empty for most | Show tag overlap and affinity values as the "why" |
| 4 | No public lists of real partner venues | Search health department and programme sites for named partner barbershops and salons | At least one area with 15+ named venues | Report licence and Qloo confirmation rates instead of partner recall |
| 5 | Long WKT polygons exceed URL length (GET only) | Send the largest simplified tract polygon | Under 8 KB URL works | Simplify further, or use centroid plus radius, or geohash prefixes |
| 6 | Qloo key arrives late | Check inbox and spam daily; ask in Discord `#api-help` | Key by Oct 18 | Build everything against recorded stubs; run Qloo parts the day the key arrives |
| 7 | Ethics concern about targeting communities | Red-team set and the race inference guard | 35 of 35 (met Oct 20) | Strengthen the guard; the safety page explains the policy |
| 8 | Model cost or rate limits during judging | Spend caps; cached examples | n/a | Cached path with a banner |

## 7. Voices from the field (Pattern 9, revised Oct 20)

Getting a quote from a working practitioner before the deadline was not realistic. Instead, Anchor quotes what people in the field have already told researchers, in peer-reviewed studies, with exact short quotes and full citations. This is shown on the landing page (`#voices`) and the research page (`/research#voices`). Source list: `anchor-app/src/content/landing.ts` (`VOICES`, `REFERENCES`).

| Voice | What it says | Source |
|---|---|---|
| 31 people from the LA barbershop trial (20 customers, 10 barbers, 1 pharmacist), interviewed afterwards | Success came from "the trust diad, comprising the familiar environment and respected community member"; spreading the model depends on finding those settings | Kohrman et al., PLoS One 2024;19(5):e0303075, doi:10.1371/journal.pone.0303075 |
| 17 Black male barbershop customers (small survey) | 47% would welcome care in a barbershop, 56% in a pharmacy, 53% at home: one venue type does not suit everyone | Chong et al., Health Equity 2023;7(1):835-842, doi:10.1089/heq.2023.0157 |
| 30 randomised trials of community health worker programmes, 15,295 people | Systolic blood pressure fell 3.72 mmHg on average (95% CI 5.94 to 1.51), low certainty | Yusuf et al., PLOS Global Public Health 2026, doi:10.1371/journal.pgph.0007191 |
| Barbershop Books (nonprofit) | 200+ barbershop partners, 23,000+ boys a month; evaluation found boys more likely to be seen reading | barbershopbooks.org |

Rules: quote exactly and briefly, never paraphrase inside quote marks, say "small survey" or "low certainty" where it applies, and never imply that any of these researchers endorse Anchor.

## 8. Devpost submission draft

- **Title:** Anchor: find the barbershops of every community
- **Tagline (verb chain):** Maps where blood pressure goes uncontrolled, finds the places those neighbours love, and hands health workers a verified outreach plan.
- **Opening (impact first, then proof; numbers filled Oct 20 from eval/results.json):** When pharmacists met men in their barbershops, 5.4 times as many got their blood pressure under control (*NEJM* 2018), enough to prevent about half of strokes if it lasts. But the programme never spread beyond Los Angeles. Anchor finds where it should go next: across Los Angeles County's 2,474 census tracts, 100% of Anchor's outreach venues sit in the highest-need fifth of neighbourhoods, against 61% for the same AI model with no tools and 18% for a map search. Every venue is confirmed in a city licence or a Qloo listing (AI alone: 41%), and all 35 safety tests pass: race targeting, bars and liquor stores, and medical advice.
- **Sections:** 1) What it does (3 lines). 2) Try it (demo link, judge mode link). 3) The problem and the research (*NEJM* 2018). 4) How Anchor uses Qloo (usage map). 5) Proof (table with baselines and negative controls). 6) Use it your way (app, API, MCP, BYOD, BYOK). 7) Safety and limits. 8) How we built it. 9) What's next. 10) References.
- **Built with:** qloo, claude, anthropic, nextjs, typescript, maplibre, openstreetmap, cdc-places, vercel, python.

## 9. Definition of done

- Every Must have in section 4 works on the live URL, on a phone and on a laptop, in both themes.
- Every number on the site comes from `results.json` or a cited source, and has an info button saying where it came from.
- `pnpm eval` reproduces the headline numbers from a clean clone (with a Qloo key).
- The submission checklist in `shared/RULES_COMPLIANCE.md` is fully ticked.

## Tools coverage

Every tool and technique named in Rules.md and the Qloo hackathon kit, and how this project uses it (live, backup, planned, or tested and left out with the reason): [../shared/TOOLS_COVERAGE.md](../shared/TOOLS_COVERAGE.md).
