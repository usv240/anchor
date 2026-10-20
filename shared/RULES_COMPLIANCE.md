# Rules Compliance and Judging Strategy

How every requirement in `Rules.md` is met and exceeded, and how each judging criterion is targeted. This applies to whichever project we submit. Project-specific evidence is in each project's `PLAN.md`.

---

## 1. Hard requirements (eligibility)

| Requirement (from Rules.md) | How we meet it | How we go beyond |
|---|---|---|
| A working application that integrates the Qloo API, and is an agentic tool, built with an agent framework, or Qloo wired into an existing agent | A Claude tool-use agent whose core tools are Qloo endpoints | We hit all three shapes: the web app (agentic tool), the agent loop (framework), and the MCP server (Qloo inside any existing agent). |
| Link to a functional demo that judges can try end to end | Public Vercel URL, no login, example pre-loaded | Works even if Qloo is down (cached example path), and has a guided 3-minute judge path at `/judges`. |
| Public code repository with all source, assets and instructions | Public GitHub repo | One-command setup (`pnpm i && pnpm dev`), `.env.example`, a reproducible eval (`pnpm eval`), and architecture docs. |
| Text description of features and what makes it Qloo-powered | Devpost write-up | Leads with the numbers and the Qloo usage map, with a "would it work without Qloo?" comparison. |
| Hosted and fully published externally | Vercel production URL | Uptime monitoring, plus spend caps that keep it alive through Nov 16. |
| Open-source licence visible in the repo's About section | `LICENSE` (MIT) at the repo root, which GitHub detects automatically | Data licences documented separately in `/data/LICENSES.md`. |
| English | All materials in English | Plain-English level with a reading score checked in CI. |
| Free access for judges until judging ends | No paywall, no account | The API demo key is public too. |
| Third-party integrations used within their terms | Licence table for every dataset and library | Qloo terms are respected by design (no raw response redistribution, no public caching of responses, BYOK for heavy use), with written confirmation sought on Discord. |
| Original work; new during the submission period | Built from scratch Oct 2026; commit history shows it | n/a |

## 2. The two judging stages

- **Stage One (pass/fail):** the theme fits and Qloo is used reasonably. We make the Qloo usage obvious in the first 3 lines of the README and the Devpost description, so there is no doubt.
- **Stage Two:** four equally weighted criteria. Ties are broken by Technological Implementation first, then Design, then Potential Impact, then Quality of the Idea. **So depth of Qloo use is the first tie-breaker, and we invest there first.**

## 3. Criterion by criterion: aiming for the ceiling

### 3.1 Technological Implementation: "How thoroughly and skillfully does the project use Qloo? Is the implementation non-trivial?"

What a 10/10 looks like, and what we ship:
- **Breadth with purpose:** 6 or more Qloo capabilities each doing a job the user can see (search, tags, insights, taste analysis, demographics or heatmap, explainability, and at least one more), all listed in the Qloo usage map on `/judges`.
- **Skill:** a parameter guard against silent failures, ID resolution, a call budget, caching and BYOK.
- **Agentic depth:** a real tool-use loop with schema-validated plans and a citation rule that stops invented results.
- **Provenance:** a hash-chained trace with a verify endpoint.
- **Engineering hygiene:** CI with unit, e2e, accessibility, performance and eval checks, with the test count stated on the page.

### 3.2 Design: "A complete, coherent product experience, not just a proof of concept."

- A full product: landing page, app, exports, API, MCP, docs, judge mode, safety page and glossary.
- WCAG 2.2 AA, light and dark, 5 viewports, Lighthouse 95+, published reports.
- The output lands in the user's real workflow (calendar files, CSV or GeoJSON for their systems, printable PDFs), so the loop closes.
- First-run clarity: example pre-filled, guided tour, info buttons on every feature, Simple/Technical layers.

### 3.3 Potential Impact: "A credible, specific case for solving a real problem for a real audience, and the solution addresses it based on what's demonstrated."

- A named audience with a named workflow (for example, county health department outreach staff).
- The size of the problem from official sources (CDC, SAMHSA, NAEP).
- A mechanism from peer-reviewed trials (for example, *NEJM* 2018).
- **Demonstrated, not claimed:** benchmark numbers against baselines, negative controls and voices from the field taken from published research.
- A path to adoption: who pays, and how it grows to other uses.

### 3.4 Quality of the Idea: "A creative, non-obvious use of Qloo, with genuine understanding of the problem space."

- Non-obvious: Qloo used as public health infrastructure (Anchor), as a cold-start bridge for children who don't read (Hooked), or to decompose a harmful routine into its healthy parts (Last Call). None of these are recommendation apps in the usual sense.
- Understanding: we cite the research gap our tool fills, state what the evidence does **not** show, and design around domain risks (race inference, child privacy, crisis safety).
- Collision check: Devpost search done on Oct 15 and 16, 2026 showed no similar Qloo projects (see `LINKS.md`).

## 4. Winner-patterns checklist (from our analysis of past winners)

| # | Pattern | Where it lives |
|---|---|---|
| 1 | Two numbers: a controlled benchmark and a real-world run | `/proof` and the first sentence of the Devpost description |
| 2 | Cases from outside our keyboard (public datasets) | `/proof`, `eval/README.md` |
| 3 | A named baseline that gets beaten | `/proof` table with all columns |
| 4 | Negative control as the headline | `/proof` top card, landing page Proof section |
| 5 | The loop closes into the user's system | Exports (CSV, GeoJSON, ICS, PDF), API, MCP |
| 6 | Depth on one surface (Qloo) | Qloo usage map |
| 7 | A tagline that is a chain of verbs | Hero and Devpost tagline |
| 8 | A demo that cannot break | Cached path, Qloo-down e2e test |
| 9 | A practitioner voice | Published voices from the field (barbers, customers, pharmacist, health worker trials), quoted exactly and cited, on the landing and research pages |
| 10 | A shipped surface beyond a demo URL | API, MCP server, installable PWA |
| 11 | Limits disclosed as measured properties | `/safety` and `/proof` |
| 12 | Something judges can inspect and rerun | `pnpm eval`, the verify endpoint, the GitHub Pages report |

## 5. Submission checklist (do on Oct 29, submit by noon Oct 30 EDT)

- [ ] Devpost title, tagline (verb chain), first sentence with two numbers
- [ ] Gallery images: hero, app result, why-Qloo comparison, proof chart, mobile and dark mode shots (judges may score from images alone)
- [ ] Optional short video (not required, but helps judges who don't click)
- [ ] Demo URL works in a private window, on a phone, and with Qloo blocked
- [ ] Repo public; LICENSE detected in About; README order: what, try it, proof, Qloo usage, setup, limits
- [ ] `JUDGES.md` and `/judges` agree
- [ ] No Qloo response data in the repo (run `pnpm check:no-qloo-data`)
- [ ] No secrets in the repo (gitleaks clean)
- [ ] Style lint clean: no emojis, no em or en dashes
- [ ] Spend caps and uptime monitor set through Nov 16
- [ ] "Built With" tags on Devpost: qloo, claude, nextjs, maplibre, and so on
