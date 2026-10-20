# Tools and Techniques Coverage (Rules.md and the Qloo hackathon kit)

Every tool and technique named in `Rules.md` and the official kit (github.com/qloo/qloo-hackathon-kit), and how each project uses it. Anchor's column comes from the running code, measured on Oct 19 and 20, 2026 with the live hackathon key. Hooked and Last Call are designs, so their columns are plans; where a route was probed live on Oct 20 (`anchor-app/scripts/qloo-probe-routes.mts`), the result is stated.

Status words: **Live** (built and working), **Backup** (built as a second path), **Tested, not used** (measured and left out for a stated reason), **Planned**, **Not available** (Qloo does not support it).

## 1. What Rules.md asks for

| Requirement | Anchor | Hooked | Last Call |
|---|---|---|---|
| Integrates the Qloo API | **Live**: 10 Qloo capabilities in the product (section 2), 3 of them with a harness backup | Planned: books from games, shows, films, stars | Planned: taste analysis of bars, place insights |
| (a) Functions as an agentic tool | **Live**: the web app runs a multi-step agent with streamed steps | Planned | Planned |
| (b) Built with an agent framework | **Live**: Claude Opus 5.5 tool use (Anthropic SDK) with schema-checked tools; a basic planner as the fallback | Planned, same pattern | Planned, same pattern |
| (c) Qloo wired into an existing agent | **Live, two ways**: Anchor's own MCP server (5 tools: need map, plan, get plan, fan reach, reading corner; smoke-tested with a real MCP client), and Qloo's official harness MCP inside Anchor | Planned | Planned |
| Cultural intelligence is the differentiator | **Measured**: Qloo alone sends only 6.9% of picks to high-need areas; Anchor without Qloo gives 5 kinds of places per plan; with Qloo, 9.9 kinds, different for each audience (11.5% average overlap) | Planned: cold-start bridge for children with no reading history | Planned: decompose a bar into its non-alcohol functions |
| Taste graph categories: music, film/TV, dining, fashion, travel and more | **Live**: dining and places (venues), film, TV, games and music artists (reading corner signals), books (reading corner output) | Live in probes: games and TV to books | Planned: music, sports, dining |
| Working demo, public repo, description, hosted, open-source licence | **Done**: github.com/usv240/anchor (MIT, shown in About), hosted at anchor-gamma-woad.vercel.app | Planned | Planned |

## 2. Qloo API surface

| Qloo capability | Anchor | Hooked | Last Call |
|---|---|---|---|
| `/v2/insights` places, with `filter.location` polygon and age/gender signals | **Live**: places a group loves in each high-need zone, re-ranked by affinity | n/a | Planned: rebuild each bar function near home |
| `/v2/insights` books (cross-domain) | **Live**: reading corner, limited to children's genres | Planned core feature (probe passed Oct 19) | n/a |
| `feature.explainability` on books | **Live**: names the interest that clearly led to a book, and flags interests that shaped none (for example Pokemon) | **Probe passed Oct 20**: credit is split about evenly between interests, so use it to spot dead interests rather than to label every book | n/a |
| `urn:demographics` | **Live**: "Who loves this place" chart | Planned: not useful for children (youngest bucket is 24 and under) | Planned |
| `urn:heatmap` (audience signal) | **Live**: taste map layer next to need | n/a | Planned: map of where your taste lives without alcohol |
| `urn:heatmap` (one place as the signal) | **Live**: fan reach on every Qloo place; in the eval, 33.5% of fan areas are high need for Anchor's community places against 17.8% for Qloo without need (chance: about 20%) | n/a | Planned: where the fans of a sober venue live |
| `urn:tag` taste analysis | **Live**: talking points around the top zone | Planned: book themes | Planned core: what a bar is made of |
| `/search` | **Live**: interests to entity ids | Planned core | Planned core |
| `/v2/tags` | **Live**: category and genre tag ids (barber shop, children's genres) | Planned | Planned: alcohol tags for exclusion |
| `filter.tags`, `filter.exclude.tags`, operators | **Live**: children's genres (union) | Planned | Planned core: exclude alcohol tags |
| `filter.hours` and place hours | **Live**: opening days feed practicality | n/a | Planned core: danger nights |
| `/v2/analysis/compare` | **Tested, not used**: works on places (shared and different tags), but Anchor's lists are already per audience | Planned | **Probe passed Oct 20** on places: the basis for the taste continuity score (old bar vs new venue) |
| `/v2/audiences` + `signal.demographics.audiences` | **Tested, not used**: affinity moved only 0.05 and order barely changed | Planned check | Planned check |
| `feature.explainability` on places | **Tested, not used**: "Could not calculate explainability" for age and gender queries | n/a (books work, above) | Planned check with entity signals |
| `/v2/trending` | **Not available** for places (only actors, artists, brands, films, people, podcasts, TV), and it needs one named entity: a time series, not a list | Tested Oct 20: needs a specific show; possible for "is this show still big" | Possible for artists |
| `/entities` (external ids such as ISBN) | Not needed (ISBN comes back in book properties) | Planned: school catalogue matching | n/a |

## 3. The hackathon kit's routes (`@qloo/qloo-harness`)

| Route | Anchor | Hooked | Last Call |
|---|---|---|---|
| `qloo mcp`: `qloo_audience_demographics` | **Backup**: audience charts; `scripts/qloo-crosscheck.mts` shows Anchor's client and the harness agree on 40 of 40 values | Planned backup | Planned backup |
| `qloo mcp`: `qloo_where_popular` | **Backup**: fan reach (live test Oct 20: 6 of 19 high-need areas via harness, 5 of 20 via REST, same place) | n/a | Planned primary for fan maps |
| `qloo mcp`: `qloo_entity_tags` | **Backup**: talking points, from the group's loved places in the top zone (20 tags in the live test) | Planned: book themes | Planned backup for bar decomposition |
| `qloo mcp`: `qloo_recommend` | **Tested, not used**: takes a named area, not a zone polygon; none of its 20 South LA picks were in the zone's own list | Planned backup (books from interests, no location needed) | Planned backup |
| `qloo mcp`: `qloo_compare_audiences` | Tested: rate limited (429) in two tries; REST compare works | Planned | Planned backup for continuity score |
| `qloo mcp`: `qloo_find_tags`, `qloo_describe` | Tested, works (barber shop tags, Minecraft) | Planned backup for tag and entity search | Planned backup |
| `qloo mcp`: `qloo_rank`, `qloo_trends` | Tested: rank failed in the adapter; trends rejected places and could not resolve a show by name | n/a | n/a |
| `qloo api` (one endpoint, JSON) | Used for probes during development | Planned for probes | Planned for probes |
| `qloo exec` (validated workflows) | Not needed: Anchor calls the same endpoints directly | Planned option | Planned option |
| `qloo explore` (chat agent) | Not used: Anchor has its own agent | n/a | n/a |
| `integrate`, `plan`, `build` modes | **Excluded by the kit's rules**, not used | Excluded | Excluded |
| Harness on the hackathon server | Configured with `QLOO_BASE_URL` and `QLOO_TRUSTED_BASE_URL` set to `https://hackathon.api.qloo.com` (the harness refuses unapproved endpoints) | Same | Same |

## 4. Rules from the kit's docs, and how each is met

| Rule | How Anchor meets it |
|---|---|
| Keys never in a repo, browser, chat or demo recording | Key only in `.env.local` (git-ignored) and server env; bring-your-own keys are used once and never stored |
| Never commit Qloo response data | Private cache in `data/qloo-cache/` (git-ignored); tests use invented data shaped like Qloo's |
| Smallest request that answers the question; bounded retries | Per-plan call budget, private cache, at most 3 retries, throttle to 4 requests a second (Qloo allows 5) |
| Explicit errors, no silent fallback to another credential | Errors are shown; the harness backup uses the same credential and the result says which path answered |
| Submission must explain tools used, a request-to-result walkthrough, setup, and limits | `/judges` Qloo usage map, `/how-it-works` real worked example, README setup, `/safety` measured limits |
| Results reflect aggregate affinity, not individuals | Stated on the site; Anchor plans by area and group, never individuals |

## 5. Backups and fallbacks (the demo cannot break)

| If this fails | Anchor does this |
|---|---|
| Qloo is slow or down | Private cache answers repeat questions; offline mode still makes a full plan from licences, and says so |
| A direct Qloo call fails | Harness MCP backup for audience charts, fan reach and talking points; the result says which path answered |
| The Claude model fails or declines | Server-side refusal fallback, then the basic planner, with the step marked |
| Open Library is down (reading corner check) | Children's publisher check only, stated on the result |
| Overpass (OpenStreetMap) is down | Not on the demo path: venue checks use city licence data |

## 6. Where the harness cannot run

The harness is a local stdio process. On Vercel's serverless functions it may not start; when it cannot, Anchor carries on with the primary REST path and says so. Backups are fully available when Anchor runs on a server or a laptop (`npm run build && npm start`).
