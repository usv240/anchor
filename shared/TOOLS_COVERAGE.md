# Tools and Techniques Coverage (Rules.md and the Qloo hackathon kit)

Every tool and technique named in `Rules.md` and the official kit (github.com/qloo/qloo-hackathon-kit), and how each project uses it. Anchor's column comes from the running code, measured on Oct 19, 2026 with the live hackathon key. Hooked and Last Call are designs, so their columns are plans.

Status words: **Live** (built and working), **Backup** (built as a second path), **Tested, not used** (measured and left out for a stated reason), **Planned**, **Not available** (Qloo does not support it).

## 1. What Rules.md asks for

| Requirement | Anchor | Hooked | Last Call |
|---|---|---|---|
| Integrates the Qloo API | **Live**: 7 Qloo capabilities in the product (section 2) | Planned: books from games, shows, films, stars | Planned: taste analysis of bars, place insights |
| (a) Functions as an agentic tool | **Live**: the web app runs a multi-step agent with streamed steps | Planned | Planned |
| (b) Built with an agent framework | **Live**: Claude Opus 5.5 tool use (Anthropic SDK) with schema-checked tools; a basic planner as the fallback | Planned, same pattern | Planned, same pattern |
| (c) Qloo wired into an existing agent | **Live, two ways**: Anchor's own MCP server (any MCP agent can plan outreach), and Qloo's official harness MCP inside Anchor | Planned | Planned |
| Cultural intelligence is the differentiator | **Measured**: Qloo alone sends only 6.9% of picks to high-need areas; Anchor without Qloo gives 5 kinds of places per plan; with Qloo, 9.9 kinds, different for each audience (11.5% average overlap) | Planned: cold-start bridge for children with no reading history | Planned: decompose a bar into its non-alcohol functions |
| Taste graph categories: music, film/TV, dining, fashion, travel and more | **Live**: dining and places (venues), film, TV, games and music artists (reading corner signals), books (reading corner output) | Live in probes: games and TV to books | Planned: music, sports, dining |
| Working demo, public repo, description, hosted, open-source licence | Built locally, MIT licence in repo; hosting is the next step | Planned | Planned |

## 2. Qloo API surface

| Qloo capability | Anchor | Hooked | Last Call |
|---|---|---|---|
| `/v2/insights` places, with `filter.location` polygon and age/gender signals | **Live**: places a group loves in each high-need zone, re-ranked by affinity | n/a | Planned: rebuild each bar function near home |
| `/v2/insights` books (cross-domain) | **Live**: reading corner, limited to children's genres | Planned core feature (probe passed Oct 19) | n/a |
| `urn:demographics` | **Live**: "Who loves this place" chart | Planned: not useful for children (youngest bucket is 24 and under) | Planned |
| `urn:heatmap` | **Live**: taste map layer next to need | n/a | Planned: map of where your taste lives without alcohol |
| `urn:tag` taste analysis | **Live**: talking points around the top zone | Planned: book themes | Planned core: what a bar is made of |
| `/search` | **Live**: interests to entity ids | Planned core | Planned core |
| `/v2/tags` | **Live**: category and genre tag ids (barber shop, children's genres) | Planned | Planned: alcohol tags for exclusion |
| `filter.tags`, `filter.exclude.tags`, operators | **Live**: children's genres (union) | Planned | Planned core: exclude alcohol tags |
| `filter.hours` and place hours | **Live**: opening days feed practicality | n/a | Planned core: danger nights |
| `/v2/analysis/compare` | Tested (works) | Planned | Planned: taste continuity score |
| `/v2/audiences` + `signal.demographics.audiences` | **Tested, not used**: affinity moved only 0.05 and order barely changed | Planned check | Planned check |
| `feature.explainability` | **Tested, not used**: "Could not calculate explainability" for age and gender queries | Planned check (books may differ) | Planned check |
| `/v2/trending` | **Not available** for places (only artists, brands, films, people, podcasts, TV) | Possible for shows and games | Possible for artists |
| `/entities` (external ids such as ISBN) | Not needed (ISBN comes back in book properties) | Planned: school catalogue matching | n/a |

## 3. The hackathon kit's routes (`@qloo/qloo-harness`)

| Route | Anchor | Hooked | Last Call |
|---|---|---|---|
| `qloo mcp` (MCP server, 10 tools) | **Backup**: audience profiles fall back to `qloo_audience_demographics`; `scripts/qloo-crosscheck.mts` shows Anchor's client and the harness agree on 40 of 40 values | Planned backup | Planned backup |
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
| A direct Qloo call fails | Harness MCP backup (audience profiles) |
| The Claude model fails or declines | Server-side refusal fallback, then the basic planner, with the step marked |
| Open Library is down (reading corner check) | Children's publisher check only, stated on the result |
| Overpass (OpenStreetMap) is down | Not on the demo path: venue checks use city licence data |
