# Links from Rules.md (all opened 2026-10-15)

| # | Link | Status | What's there |
|---|------|--------|--------------|
| 1 | https://qloo.devpost.com/ | Opened | Hackathon overview. Deadline **Oct 30, 2026 11:45pm EDT**. $25k ($15k / $6k / $4k) plus a separate $25k investment from Jason Calacanis in his favourite entry. 1,534 participants. |
| 2 | https://qloo.devpost.com/resources | Opened | Points to the API key form, the hackathon kit repo and the Discord. |
| 3 | https://qloo.devpost.com/rules | Opened | Official rules: equal-weight criteria (Tech / Design / Impact / Idea). Tie-break order is the same. Stage 1 is pass/fail on theme fit and API use. Judging may include "automated AI-driven analysis". |
| 4 | https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide | Opened | Base URL `https://hackathon.api.qloo.com`, `X-Api-Key` header. `/v2/insights` is GET only. Invalid params are **silently ignored**, which is the usual cause of empty results. `/recommendations` is legacy. Server-side caching is allowed; **never commit response data to a public repo**. |
| 5 | https://github.com/qloo/qloo-hackathon-kit | Opened | `@qloo/qloo-harness` (Node 22.19+, v0.1.26+). Three routes: `qloo explore` (chat), `qloo exec` / `qloo api` (CLI/JSON), `qloo mcp` (MCP server). `docs/SUBMISSION.md` asks for a problem statement, the Qloo tools used and why, a **request-to-result walkthrough**, setup from a clean environment, and **limitations ("what the result does not establish")**. Judges look at usefulness, execution, **provenance**, responsible data handling and reproducibility. |
| 6 | https://discord.gg/rF9PKsD5Q7 | Opened (redirects to discord.com/invite) | Server "Qloo Agentic Hackathon 2026". Use #api-help to ask for quota raises. |
| 7 | https://info.devpost.com/terms | Opened | You keep your IP. Devpost and the sponsor get a promo license. The work must be original and not duplicate another entry. |
| 8 | https://info.devpost.com/privacy | Opened | Profile is public; submission data is shared with the sponsor. |

## Qloo API surface (from docs.qloo.com, needed for the build)

| Capability | Call | Notes |
|---|---|---|
| Entity search | `GET /search?query=&types=` | Resolve names to entity IDs |
| Tag search | `GET /v2/tags?filter.query=` | No static tag list exists, so look tags up |
| Tag types | `GET /v2/tags/types` | |
| Entities by ID / external ID | `GET /entities?entity_ids=` or `external.spotify.ids=` etc. | Spotify, IMDb, Goodreads, Resy, Michelin… |
| **Insights (recs)** | `GET /v2/insights?filter.type=urn:entity:place&signal.interests.entities=…` | `filter.location`, `filter.location.radius`, `filter.tags`, **`filter.exclude.tags`**, **`filter.hours`**, `filter.price_level`, `bias.trends`, **`feature.explainability=true`**, `diversify.by`, `take<=50` |
| **Taste analysis** | `GET /v2/insights?filter.type=urn:tag&signal.interests.entities=…` | Returns the tag profile of an entity or group of entities |
| Demographics | `filter.type=urn:demographics` | Age buckets and gender affinity, centred on 0 |
| Heatmap | `filter.type=urn:heatmap&filter.location.query=…` | Geohash cells with affinity, affinity_rank and popularity |
| Compare | `GET /v2/analysis/compare?a.signal.interests.entities=&b.signal.interests.entities=` | Compares two entity groups |
| Trending | `GET /v2/trending?filter.type=&signal.interests.entities=&filter.start_date=&filter.end_date=` | Weekly percentile, rank, velocity |
| Audiences | `GET /v2/audiences?filter.parents.types=urn:audience:hobbies_and_interests` | IDs go into `signal.demographics.audiences` |

## Prior Qloo hackathon (2025): winners and crowding

https://qloo-hackathon.devpost.com/project-gallery has 344 projects. The winners were:
- **GeoTaste** (Grand Prize): location → business-market insights agent
- **Resonance AI**: culturally authentic political campaign messaging
- **Zesty**: "unrecommendation" engine that flips your feed
- **Alloy**: cultural due diligence for M&A (Cultural Compatibility Score)

The 2025 gallery is dominated by travel concierges, "cultural DNA" profiles, marketing/persona tools, group-dining pickers and fashion stylists. **Avoid all of these.**

The 2026 gallery isn't published yet. A Devpost-wide search on 2026-10-15 shows these are already taken: **dementia reminiscence** (Memory Lane ×2, Echoes, Encore, LumiCue), **newcomer/moving city** (Tastes Like Home), **group dinner hosting** (Hostwise), **audience/partner finding** (Overlap).
