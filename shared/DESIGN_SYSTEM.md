# Shared Design System

This file sets the design rules for all three projects (Anchor, Hooked, Last Call). Each project uses the same structure, components and quality bar, and only changes its accent colour, content and domain logic.

Writing rules for every page, doc and UI string:
- No emojis anywhere.
- No em dashes or en dashes. Use commas, colons, full stops or the word "to" (for example "ages 35 to 54").
- Plain English, aimed at a reading age of about 12 (US grade 6 to 8). Technical detail sits behind a switch or an info button. It is never removed, only layered.

---

## 1. Design goals, in priority order

1. **Understood in one visit.** A person with zero background, or a judge with 3 to 5 minutes, can say what the product does, for whom, and why it matters, without scrolling past the first screen.
2. **Trusted.** Every number has a source. Every recommendation says why it was made. Every limit is stated as a measured fact.
3. **Usable by anyone.** Light and dark mode, phone and desktop, keyboard and screen reader, slow connections.
4. **Calm and premium.** Generous space, one strong accent colour, no visual noise, no dark patterns.
5. **Fast.** Feels instant. The demo never shows a blank screen.

## 2. Research basis (what each rule comes from)

| Principle | Source | How we apply it |
|---|---|---|
| 10 usability heuristics (system status, real-world language, user control, consistency, error prevention, recognition over recall, flexibility, minimalism, error recovery, help) | Nielsen, NN/g, "10 Usability Heuristics" | Section 9 maps each heuristic to a concrete feature. |
| Progressive disclosure: show essentials first, reveal advanced options on request, never more than 2 levels | Nielsen, NN/g, "Progressive Disclosure" | Simple/Technical switch (level 1) and info buttons (level 2). No third level. |
| Minimum target size 24 by 24 CSS px (WCAG 2.2 SC 2.5.8, AA) | W3C WAI | We exceed it: **44 by 44 px** minimum for every tappable control (Apple HIG default). |
| Text contrast at least 4.5:1 (WCAG AA) | W3C WCAG 2.2 SC 1.4.3 | Body text targets **7:1** (AAA) in both themes; UI text never below 4.5:1. |
| Tooltips must not hold interactive content and must close on Escape; interactive popups should be non-modal dialogs | W3C ARIA Authoring Practices, Tooltip pattern | Our info button is a click/tap **toggletip** (non-modal popover), not a hover tooltip. Section 6. |
| Respect user motion and colour preferences | CSS Media Queries Level 5 (`prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`) | The theme follows the system by default, can be overridden, and the choice is remembered. Animations are disabled under reduced motion. |
| Core Web Vitals: LCP under 2.5 s, INP under 200 ms, CLS under 0.1 | web.dev (Google) | Published Lighthouse CI report in the repo. Section 10. |
| Colour-blind-safe data scales | Cividis/viridis perceptually uniform colour maps (Nuñez et al., PLoS One 2018; matplotlib viridis) | Maps use a single-hue or cividis-like sequential scale, and are never red-green. |

## 3. Information architecture (identical for all three sites)

```
/                    Landing page (explains everything, links to every part)
/app                 The product (the live agent)
/how-it-works        Step-by-step walkthrough with a real example and its full trace
/proof               Results: benchmark, baselines, negative controls, how to rerun
/research            The studies, in plain words, with full references
/developers          API, MCP server, bring-your-own-key, bring-your-own-data, code samples
/judges              Judge mode: 3-minute tour, rubric mapping, how to verify every claim
/safety              Limits, privacy, what the tool does not do
/glossary            Every term on the site, explained simply
```

Global header (all pages): logo, the nav above (collapses to a menu on phones), **Simple / Technical** switch, **theme** switch (System / Light / Dark), and a primary button "Try it".

Global footer: licence (MIT), GitHub repo, data sources with licences and attribution (OpenStreetMap requires "© OpenStreetMap contributors"), "Powered by Qloo", disclaimer, contact.

## 4. Landing page template (section by section)

Each project fills this template with its own content (see each project's `UX_AND_CONTENT.md`). The order follows how a first-time visitor builds understanding: what, why, how, proof, try, trust.

| # | Section | Purpose | Must contain |
|---|---|---|---|
| 1 | **Hero** | What and for whom, in 5 seconds | Headline (8 words or fewer), one sentence that says who it helps and how, primary button "Try the live demo", secondary button "See how it works (60 sec)". A small line: "Built on Qloo's taste data and peer-reviewed research." |
| 2 | **The problem in 3 numbers** | Why it matters | Three large stat cards, each with a one-line meaning and a source link. |
| 3 | **The research** | Why we believe it works | One study card: the question, what they did, what happened (one big number), what it means for us. Link to /research. |
| 4 | **How it works in 4 steps** | Mental model | Numbered steps with a simple diagram. Each step has an info button. |
| 5 | **Why Qloo (and not just AI)** | The judging-critical "would it work without Qloo?" | Side-by-side: "AI alone" vs "Our agent with Qloo" on the same request, with the differences highlighted. |
| 6 | **See it work** | Show, don't tell | An embedded, pre-loaded example result (works offline from cache), with a button to open it live. |
| 7 | **Proof** | Credibility | Headline numbers: our system vs named baselines, the negative control, "rerun it yourself" link. |
| 8 | **Who it is for** | Self-identification | 3 or 4 audience cards (for example: practitioner, organisation, developer, judge), each with "start here" links. |
| 9 | **Use it your way** | Reach and extensibility | Web app, API, MCP for AI agents, bring your own data, bring your own Qloo key. Simple words first, a code sample behind the Technical switch. |
| 10 | **Safety and limits** | Trust | What it does not do, privacy promises, measured limits. |
| 11 | **FAQ** | Remove doubts | 8 to 12 questions in plain words, as an accordion. |
| 12 | **References** | Rigor | Numbered citations with DOIs. |
| 13 | **Footer** | Housekeeping | As in Section 3. |

Above the fold on desktop (1440 by 900) and on mobile (390 by 844): the headline, one-sentence description, primary button and the "Powered by Qloo" line must all be visible without scrolling.

## 5. The Simple / Technical switch

- One global switch in the header. It defaults to **Simple** and the choice is remembered in localStorage.
- Every content block can have a simple version and an optional technical version. Under Technical, the technical text appears in addition to the simple text, with code, parameters, formulas and endpoint names. Simple text is never hidden.
- This is a single level of disclosure. The info button is the second. There is never a third.
- Implementation: a `<Layered simple={...} technical={...} />` component, with content in `content/*.mdx`.

## 6. The info button ("i")

Purpose: anyone can ask "what is this and why is it here?" about any feature, number, button or term, without leaving the page.

**Where it goes:** next to every step, stat card, filter, score, map legend, chart, export button, API field, and any term in the glossary. The rule: if a first-time user might wonder about it, it gets an info button. An inventory per project is in each `UX_AND_CONTENT.md`.

**Behaviour (accessible toggletip pattern):**
- A real `<button>` with an "i" glyph drawn in SVG (not an emoji), and `aria-label="About: <feature name>"`.
- The hit area is **44 by 44 px**, even though the visible glyph is 18 px.
- Click, tap, Enter or Space opens a **non-modal popover** (HTML Popover API, falling back to Radix Popover) anchored to the button. Hover does not open it, so it works the same on touch screens.
- Escape, clicking outside or pressing the button again closes it, and focus returns to the button.
- The content is announced by screen readers (the popover gets `role="dialog"`, `aria-labelledby` its title, and focus moves to it).
- On phones it opens as a **bottom sheet** for readability.

**Content structure (always the same 3 parts, about 60 words total):**
1. **What it is:** one sentence.
2. **Why it matters:** one sentence.
3. **Where it comes from:** the data source or method, with a "Learn more" link to /glossary, /research or /developers.
- Under the Technical switch, a 4th part appears: **Technical detail** (parameter names, formula, endpoint).

**Single source of truth:** all info content lives in `content/info.ts` as typed entries `{ id, title, what, why, source, learnMoreHref, technical? }`. A unit test fails the build if any `<Info id>` points to a missing entry, or if any entry has an emoji, an em or en dash, or a Flesch reading ease below 60.

## 7. Visual language

### 7.1 Colour tokens (CSS variables; both themes checked for contrast)

Shared neutrals:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FBFBFA` | `#0E1116` | Page background. Never pure white or pure black, to reduce glare and halation. |
| `--surface` | `#FFFFFF` | `#161B22` | Cards |
| `--surface-2` | `#F3F4F6` | `#1F2630` | Raised or hovered surfaces. In dark mode, elevation is shown by lighter surfaces, not shadows. |
| `--text` | `#111418` | `#E8EAED` | Body text (about 16:1 on light, 14:1 on dark) |
| `--text-muted` | `#4B5563` | `#A9B1BC` | Secondary text (above 7:1 on light, above 8:1 on dark) |
| `--border` | `#E3E5E8` | `#2B333E` | Dividers |
| `--focus` | `#1D4ED8` | `#8AB4F8` | Focus ring, 3 px, always visible on keyboard focus |
| `--success` / `--warning` / `--danger` | `#0F7B3F` / `#9A5B00` / `#B42318` | `#5FD39A` / `#F2B661` / `#FF8A80` | Status. Always paired with an icon and words, never colour alone. |

Accent colour per project. Each is checked at 4.5:1 or better against `--bg` in its theme:

| Project | Light accent | Dark accent | Meaning |
|---|---|---|---|
| Anchor | `#0B6E99` (deep harbour blue) | `#5CC3EE` | Trust, health, steadiness |
| Hooked | `#7A3FD1` (story violet) | `#B794F6` | Imagination, reading |
| Last Call | `#B45309` (warm amber) | `#F6AD55` | Warmth, evening light, a new routine |

Data colours: sequential map scale from `--surface-2` to the accent in 7 steps (single hue, colour-blind safe). There is one categorical palette of 6 colours, each tested with a colour-blindness simulator (deuteranopia, protanopia, tritanopia), and every category also has a text label or pattern.

Contrast is checked automatically: a test computes WCAG ratios for every foreground and background token pair in both themes and fails the build below the targets.

### 7.2 Typography

- Font: **Inter** (variable, self-hosted, `font-display: swap`), with the system UI stack as fallback. Numbers use tabular figures in tables and stats.
- Scale (rem): 0.875 caption, 1.0 body (16 px minimum, never smaller on mobile), 1.125 lead, 1.5 h3, 2.0 h2, 2.75 h1 (desktop) / 2.0 h1 (mobile). Fluid sizing via `clamp()`.
- Line height 1.6 for body, 1.2 for headings. Measure 60 to 72 characters.
- Sentence case for all headings and buttons. No all-caps except tiny eyebrow labels.

### 7.3 Space, shape, depth

- 4 px base grid. Spacing tokens 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Corner radius 12 px for cards, 10 px for buttons, 999 px for pills.
- Shadows only in light mode, and subtle (y 1 px, blur 2 px, 6% black, plus y 8 px, blur 24 px, 6% black). Dark mode uses surface steps instead.

### 7.4 Motion

- 150 to 250 ms, ease-out. Motion only explains change (a panel slides from where it was triggered). No decorative motion.
- `prefers-reduced-motion: reduce` removes all transitions except opacity fades under 100 ms.

### 7.5 Iconography and imagery

- One icon set: Lucide (MIT), 1.5 px stroke, 20 px default. Never emojis.
- No stock photos of people in distress. Use calm illustrations or real, licensed maps.

## 8. Responsive layout

| Breakpoint | Width | Layout |
|---|---|---|
| Phone | under 640 px | Single column. Bottom navigation in the app (Map, List, Plan, Export). Info buttons open as bottom sheets. Map and list toggle; selecting an item opens a bottom sheet. A sticky primary action sits at the bottom, inside the thumb zone. |
| Tablet | 640 to 1023 px | Two columns where useful. Side sheet for details. |
| Desktop | 1024 px and up | App: left panel (inputs and list, 400 px), centre map or content, right detail panel (360 px, collapsible). Landing: 12-column grid, max width 1200 px. |

Tested on real-device sizes: 360 by 800 (small Android), 390 by 844 (iPhone), 768 by 1024 (iPad), 1440 by 900 (laptop), 1920 by 1080, all in both themes, via Playwright screenshots in CI.

## 9. Nielsen heuristics, applied

| Heuristic | Concrete feature in all three apps |
|---|---|
| Visibility of system status | A live "agent steps" panel shows each step as it runs ("Finding high-need neighbourhoods... done, 42 found"). A skeleton loader appears within 100 ms, never a spinner alone. |
| Match with the real world | Plain labels ("Neighbourhoods that need it most", not "top-quintile tracts"). The technical name appears only under the Technical switch. |
| User control and freedom | Every step can be edited and re-run. Undo for removing an item. Plans auto-save locally and can be reset. |
| Consistency and standards | One component library, one button hierarchy (primary, secondary, ghost), the same info button everywhere. |
| Error prevention | Inputs have sensible defaults and examples. Validation happens as you type. Uploads are checked before processing (see BYOD in `PLATFORM.md`). |
| Recognition over recall | Chips for previous choices, visible filters, recent plans list. |
| Flexibility and efficiency | Keyboard shortcuts (`/` focuses search, `g m` opens the map, `?` lists shortcuts), API and MCP for power users, shareable URLs that encode a plan. |
| Aesthetic and minimalist design | One primary action per screen. Advanced options sit behind "More options". |
| Help users recover from errors | Errors say what happened, why, and what to do, with a retry button. Example: "Qloo did not answer in time. Your plan is safe. Retry, or use the saved example." |
| Help and documentation | Info buttons, the glossary, the guided tour, and /how-it-works with a real trace. |

## 10. Quality bar (measured, published in the repo)

| Area | Target | How it is checked |
|---|---|---|
| Accessibility | WCAG 2.2 AA, zero axe-core violations on every page in both themes | `@axe-core/playwright` in CI, plus a manual screen reader pass (NVDA on Windows, VoiceOver on iOS) |
| Performance | Lighthouse 95+ in Performance, Accessibility, Best Practices and SEO on mobile; LCP under 2.5 s, INP under 200 ms, CLS under 0.1 | Lighthouse CI, report committed to `/docs/lighthouse` |
| Readability | Flesch reading ease 60+ for all Simple text | Unit test over `content/` |
| Style rules | Zero emojis, zero em or en dashes in content and UI strings | Regex lint in CI |
| Contrast | All token pairs meet the targets in both themes | Unit test |
| Responsiveness | No horizontal scroll at 360 px; all targets 44 px or more | Playwright checks |
| Reliability | The demo works with Qloo offline (cached example path) | Playwright test with the network to Qloo blocked |

## 11. First-run experience (for a brand-new user or judge)

1. The landing page explains the product without any click.
2. "Try the live demo" opens `/app` with an **example already filled in** (one click to run), plus a dismissible 4-step guided tour (spotlight on: inputs, agent steps, results, export). The tour can be reopened from the help menu.
3. While the agent works, the steps panel teaches how it works.
4. The results screen opens with a one-paragraph plain summary ("We found 12 places in 5 neighbourhoods..."), then the details.
5. An empty state is never blank: it explains what will appear and offers the example.

## 12. Component inventory (shared library)

Button, IconButton, Info (toggletip), Layered (Simple/Technical), StatCard (number, meaning, source), StudyCard, StepList, AgentStepsPanel, ResultCard (title, why, source trace, actions), MapView (MapLibre, accessible list twin), Legend, DataTable (sortable, keyboard accessible), Tabs, Accordion, Sheet (bottom and side), Dialog, Toast (polite live region), EmptyState, ErrorState, Skeleton, ThemeSwitch, CodeBlock (copy button, language tabs), Upload (drag and drop with validation report), ApiKeyPanel, TraceViewer, GuidedTour.

Every map has an **accessible list twin**: the same results as a table, with the same order and data, so screen reader users and judges in a hurry get everything without the map.
