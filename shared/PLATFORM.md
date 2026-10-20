# Shared Platform Design

The technical foundation used by all three projects: stack, agent loop, Qloo client, provenance, the public API, bring your own key (BYOK), bring your own data (BYOD), the MCP server, judge mode, security, testing and deployment. Each project's `TECHNICAL_DESIGN.md` adds only its own domain logic on top of this.

---

## 1. Ways to use each product

| Who | How they use it | What they need |
|---|---|---|
| Anyone, including judges | **Web app**, with no sign-up and an example pre-loaded | A browser |
| Organisations with their own data | **Bring your own data (BYOD)**: upload a CSV or GeoJSON, processed in the browser by default | A file |
| Developers | **REST API** with a personal API key, OpenAPI 3.1 spec, code samples in curl, JavaScript and Python | An API key from `/developers` |
| AI agents (Claude, ChatGPT, Cursor and others) | **MCP server**: our agent's capabilities as tools any MCP-compatible agent can call | One line of config |
| Heavy users | **Bring your own Qloo key (BYOK)**: their own Qloo quota, passed through and never stored | Their own Qloo key |

This answers the hackathon's three accepted shapes at once: an agentic tool (the web app), built with an agent framework (the agent loop), and Qloo wired into an existing agent (the MCP server).

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | Next.js 15 (App Router), React 19, TypeScript (strict) | One codebase for the site, app and API routes; server components keep keys server-side. |
| Styling | Tailwind CSS v4 with CSS variable tokens from `DESIGN_SYSTEM.md` | Light and dark from one set of tokens. |
| Accessible primitives | Radix UI (Popover, Dialog, Tabs, Accordion), HTML Popover API where supported | Keyboard and screen reader behaviour done right. |
| Maps | MapLibre GL JS (BSD), OpenStreetMap-based vector tiles (Protomaps PMTiles, self-hosted) | No map API key, no usage cost, works in dark mode. |
| Charts | Visx or Recharts with design-system colours | Accessible, themeable. |
| Agent | Anthropic Claude via the official TypeScript SDK with tool use. Default model `claude-sonnet-5-5`; `claude-haiku-5-5` for cheap sub-steps; `claude-opus-5-5` only as the evaluation judge | Strong tool use; the latest Claude 5 family. |
| Validation | Zod schemas for every tool input and output and every API body | One schema gives types, validation and OpenAPI docs. |
| Storage | Upstash Redis (API keys as hashes, rate limits, private Qloo cache, short-lived plans) | Serverless and simple. No user accounts and no personal data stored. |
| Static data | Pre-processed public datasets as compressed GeoJSON or Parquet in `/data/public` (only data whose licence allows redistribution) | Fast and reproducible. |
| Evaluation harness | Python 3.12, `uv`, pandas, geopandas, rapidfuzz | The right tools for data work; separate from the web app. |
| Hosting | Vercel (web and API), GitHub Pages (eval report) | Free tier is enough; a public URL that stays up through the judging period. |
| CI | GitHub Actions: typecheck, lint, unit, e2e (Playwright), axe accessibility, Lighthouse CI, style lint (no emojis or dashes), eval smoke test | Every claim on the site is backed by a passing check. |

## 3. Repository layout (same for each project)

```
/app                  Next.js routes: landing, /app, /proof, /research, /developers, /judges, /safety, /glossary
/app/api/v1           Public REST API
/app/api/mcp          Remote MCP endpoint (Streamable HTTP)
/components           Shared UI library (see DESIGN_SYSTEM.md, section 12)
/content              All copy: info.ts, glossary.ts, faq.ts, landing.mdx, references.ts
/lib/qloo             Qloo client (typed, cached, traced, BYOK-aware)
/lib/agent            Agent loop, tools, prompts, plan schema
/lib/domain           Project-specific logic (scoring, verification, exports)
/lib/trace            Provenance ledger
/data/public          Redistributable public data (with LICENSES.md)
/eval                 Python evaluation harness, red-team sets, results.json, report generator
/docs                 Architecture diagrams, Lighthouse reports, API reference
/tests                Unit (Vitest) and e2e (Playwright)
LICENSE               MIT (detected by GitHub, shown in the About section)
README.md             Plain-language first, then technical, then judge section
JUDGES.md             How to verify every claim in under 5 minutes
.env.example          Variable names only, never values
```

## 4. Qloo client (`lib/qloo`)

- **Base URL:** `https://hackathon.api.qloo.com`. Header `X-Api-Key`. GET only for `/v2/insights` (the hackathon guide says query strings only).
- **Typed endpoints:** `search`, `tags`, `tagTypes`, `entities`, `insights` (entities, `urn:tag` taste analysis, `urn:demographics`, `urn:heatmap`), `compare`, `trending`, `audiences`.
- **Parameter guard:** Qloo silently ignores invalid parameters (hackathon developer guide). The client keeps a per-`filter.type` allow-list built from the "Available parameters by entity type" page and **throws before sending** if a parameter is not valid for that type. This prevents the most common silent failure, empty results.
- **ID resolution:** names always go through `/search` or `/v2/tags` first; the client never invents URNs.
- **Caching:** a private server-side cache in Redis, keyed by a hash of the normalised request, with a 7-day TTL. Qloo allows private server-side caching. **Qloo response bodies are never written to the public repository**, including test fixtures. Tests use recorded fixtures stored outside the repo, or synthetic stubs with an obviously fake shape.
- **Budget:** request coalescing, at most 3 retries with jittered backoff, and a per-plan call budget (for example 40 calls). If the budget is reached, the agent stops and says so.
- **Errors:** explicit and user-visible. No silent fallback to another key or endpoint (the hackathon kit's API access rule).

## 5. Agent loop (`lib/agent`)

- A tool-use loop with a fixed toolset per project, plus a planner prompt, run at temperature 0 for reproducibility.
- Each tool has a Zod input and output schema. The model's final answer must match a **Plan schema**; if it doesn't, it gets one repair attempt, then a clear error.
- **Citation rule (tool-ref validation):** every item in a plan must cite the trace IDs of the tool calls that produced it. The server rejects any plan item that cites a trace ID that doesn't exist or doesn't contain that entity. The model cannot invent a venue, book or place.
- **Streaming:** the server streams step events (`step.started`, `step.result`, `step.done`) over Server-Sent Events to drive the "agent steps" panel.
- **Deterministic fallbacks:** if the model API fails, a rules-based planner produces a basic plan from the same tool results, labelled "basic mode".

## 6. Provenance ledger (`lib/trace`)

- Every tool call writes a trace record: `{ id, ts, tool, request (key removed), response_sha256, summary, prev_hash }`.
- Records are hash-chained (each includes the hash of the previous one), so a plan's evidence cannot be edited silently.
- `GET /api/v1/plans/{id}/trace` returns the chain. `GET /api/v1/plans/{id}/verify` recomputes the chain and returns `valid: true/false`.
- In the UI, every result card has "Why this?" (explainability in plain words) and "Show evidence" (the trace, with the exact Qloo parameters under the Technical switch).
- The hackathon kit's `docs/SUBMISSION.md` asks for a "request-to-result walkthrough", and judges look at "provenance and user clarity". The trace viewer is exactly that, live.

## 7. Public REST API (`/api/v1`)

### 7.1 Access

- **Get a key:** on `/developers`, "Create API key" makes a key (`<prefix>_live_<32 random chars>`, for example `anc_live_...`). It is shown **once**. The server stores only its SHA-256 hash, a label and limits. No email is required for the free tier, but the creator's IP is rate-limited to 3 keys per day.
- **Demo key:** `<prefix>_demo` is public and documented. It only returns cached example plans and costs nothing.
- **Auth header:** `Authorization: Bearer <key>`.
- **Rate limits (free tier):** 20 plans per day, 60 requests per minute. Limits are returned in `RateLimit-*` headers, with HTTP 429 and a `Retry-After` header when exceeded.
- **Versioning:** URL versioned (`/v1`). Breaking changes go to `/v2`.

### 7.2 Respecting Qloo's terms (important)

The hackathon kit (`docs/API_ACCESS.md`) says Qloo credentials must be individually attributable, not shared across teams, never in a browser, and requests must be minimal, without bulk scraping or recreating a database. So:
- Our hosted key is used only by our own agent for plan generation, under the strict per-key quotas above and the private cache. Our API never exposes raw Qloo responses; it returns plans, scores and short evidence summaries.
- **BYOK** (section 8) is the recommended path for heavier use, so each caller's Qloo usage is attributable to them.
- **Action item:** confirm this model with Qloo in the Discord `#api-help` channel before launch, and keep the reply in `docs/qloo-permission.md`.

### 7.3 Common endpoints (each project adds its own)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/plans` | Create a plan (body is project-specific). Returns `202` with a plan ID, plus a stream URL. |
| GET | `/api/v1/plans/{id}` | Get the finished plan (JSON). |
| GET | `/api/v1/plans/{id}/events` | Server-Sent Events stream of agent steps. |
| GET | `/api/v1/plans/{id}/trace` | Provenance chain. |
| GET | `/api/v1/plans/{id}/verify` | Check the chain. |
| GET | `/api/v1/plans/{id}/export.{csv,geojson,ics,pdf,json}` | Exports (project-specific formats). |
| GET | `/api/v1/openapi.json` | OpenAPI 3.1 spec, generated from the Zod schemas. |
| GET | `/api/v1/health` | Status of our service, Qloo reachability and cache. |

The `/developers` page renders the spec with a "Try it" console (using the demo key by default), copyable code samples in curl, JavaScript and Python, and a plain-words explainer at the top: "An API lets other software use this tool automatically. If you are not a developer, you can ignore this page."

## 8. Bring your own Qloo key (BYOK)

- Send `X-Qloo-Key: <your Qloo key>` with any API request, or paste it into the app under "Advanced: use my own Qloo key".
- The key is used for that request only. It is **never stored, logged or cached**, and a log scrubber removes the header. In the browser it lives only in memory for the session, and is sent over HTTPS to our server route, which forwards it to Qloo. (The kit says never call Qloo from a browser app, so the browser never calls Qloo directly.)
- Cache entries made with a BYOK key are stored separately, keyed with a hash of the key, so one caller's quota never serves another caller.

## 9. Bring your own data (BYOD)

The aim is to let real organisations use their own data safely, without us holding sensitive data.

- **Formats:** CSV, XLSX and GeoJSON. Each project publishes **templates** (downloadable files with example rows) and a column dictionary.
- **Processing:** **in the browser by default** (Papa Parse, SheetJS, Turf.js). Only derived, non-personal values (for example a polygon, an area-level count or a list of venue names) are sent to the server, and only when the user clicks "Use this data".
- **Validation report before use:** row count, recognised columns, rows with problems (with line numbers and a fix), a map preview for geographic files, and a summary of what will be sent.
- **Personal data guard:** a column-name and pattern detector blocks uploads that look like personal or health records (names, dates of birth, phone numbers, emails, medical record numbers, exact street addresses for people). The message reads: "This file looks like it contains information about individual people. For your safety we only accept area-level or venue-level data. Remove these columns and try again."
- **Lifetime:** BYOD data is kept in the browser (IndexedDB) until the user clears it. If it is sent to the API, it is held only as long as the plan exists (24 hours by default) and is never used for anything else.
- **API:** the same data can be sent as JSON in the `byod` field of `POST /api/v1/plans`.

## 10. MCP server

- **Remote:** `https://<project-domain>/api/mcp` (Streamable HTTP transport), authenticated with an API key.
- **Local:** `npx <project>-mcp` (stdio) for desktop clients.
- **Tools:** 3 to 5 high-level tools per project (for example `anchor_find_venues`, `anchor_need_map`, `anchor_export_plan`). Each tool has a clear description and schema, and returns plain-language summaries plus structured data.
- **Why it matters:** any existing agent can gain the capability with one config line. The `/developers` page shows ready-to-copy configs for Claude Desktop, Claude Code and other MCP clients.

## 11. Judge mode (`/judges`)

- **A 3-minute guided path:** what it is (30 s), run the example (60 s), check the proof (60 s), verify a claim yourself (30 s).
- **Rubric map:** for each official criterion (Technological Implementation, Design, Potential Impact, Quality of the Idea), what we did and where to see it, with deep links.
- **Verify buttons:** "Recompute this number" runs the eval smoke test on a small cached sample in the browser, and "Verify trace" calls the verify endpoint.
- **The full Qloo usage map:** every Qloo endpoint and parameter we use, why, and a live example call (redacted key).
- The rules allow judges to evaluate from the text and images alone, and allow automated AI-driven analysis. So `README.md` and `JUDGES.md` mirror this page in clean markdown with clear headings, numbers and links, readable by both humans and machines.

## 12. Security and privacy

- Secrets only in Vercel environment variables. `.env.example` holds names only. A secret scanner (gitleaks) runs in CI.
- Content Security Policy, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`.
- No user accounts, no cookies except a theme or preference cookie (or localStorage), no third-party trackers. Analytics, if any, uses privacy-friendly aggregate page counts with no personal identifiers.
- Inputs are validated with Zod. Uploads are size-limited (10 MB) and parsed in the browser.
- LLM safety: a system prompt with explicit refusal rules per project, output schema enforcement, and project-specific red-team sets in `/eval/redteam` with published pass rates.
- Data licences are listed in `/data/LICENSES.md` and on the site footer (for example OpenStreetMap ODbL attribution, CDC public domain).

## 13. Testing strategy

| Level | Tool | What |
|---|---|---|
| Unit | Vitest | Scoring formulas, parameter guard, BYOD validators, personal data guard, trace hashing, content lint (no emojis, dashes; readability) |
| Contract | Zod plus recorded Qloo fixtures (kept outside the repo) | Qloo client parsing |
| Integration | Vitest with a mocked Qloo and mocked model | Agent loop end to end, citation rule enforcement |
| End to end | Playwright | First-run path, both themes, 5 viewports, keyboard-only path, Qloo-down path |
| Accessibility | axe-core plus a manual screen reader checklist | Zero violations |
| Performance | Lighthouse CI | Budgets in `DESIGN_SYSTEM.md` section 10 |
| Evaluation | Python harness | Headline numbers, baselines, negative controls, red-team |

## 14. Deployment and uptime through judging

- Judging runs from Nov 2 to Nov 16, 2026. The rules require free, unrestricted access until judging ends.
- Vercel production deploy from `main`, with preview deploys per pull request.
- A health check (`/api/v1/health`) is monitored by a free uptime service every 5 minutes, with alerts.
- A **demo cache** for the pre-loaded examples means the core demo works even if Qloo or the model provider is down. A banner then explains: "Live data is temporarily unavailable. You are seeing a saved example."
- Model and Qloo spend caps are set so a traffic spike cannot exhaust the budget before judging ends. When a cap is reached, the app switches to cached examples and says so.
