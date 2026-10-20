# Anchor: UX and Content

Design rules come from [../shared/DESIGN_SYSTEM.md](../shared/DESIGN_SYSTEM.md). This file holds Anchor's users, journeys, every page's words, screens for phone and desktop, every info button, the glossary and the FAQ. Accent colour: harbour blue (`#0B6E99` light, `#5CC3EE` dark).

---

## 1. Personas

| Persona | Who | Goal | Worry | What they need from us |
|---|---|---|---|---|
| **Denise, community health worker** | Works in South LA, phone-first, 10 years in the community | Find good places to hold free blood pressure checks this month | "Will these places actually welcome us? Do I have to learn new software?" | A short list, days to go, words to say, works on her phone |
| **Marcus, health department outreach lead** | Plans outreach across a county, uses Excel and a GIS tool | Spend a small budget where it does the most good, and justify it | "Can I trust the data? Will my boss accept it?" | Need map, sources, exports for his tools, a method he can explain |
| **Priya, health plan quality manager** | Responsible for the "Controlling High Blood Pressure" quality score | Reach members who don't come to clinics | "Is this compliant? Does it touch member data?" | No personal data, BYOD at area level, API for her team |
| **A judge** | 3 to 5 minutes, may not click anything | Decide if this is real, clever, well built and important | "Is this just a wrapper? Does it really need Qloo?" | The first screen says it all; judge mode; proof; Qloo usage map |
| **First-time visitor** | Curious, no health or tech background | Understand what this is | "What is a census tract? What is Qloo?" | Plain words, info buttons, glossary |
| **Developer** | Builds tools for health organisations | Use Anchor inside their own system or agent | "Is there an API? Limits? Docs?" | OpenAPI, keys, MCP config, code samples |

## 2. Key journeys

**J1. Judge, 3 minutes:** Landing hero (understands it in 10 s) > "See how it works" > example plan opens pre-run > clicks a venue's "Why this place" > `/proof` headline numbers > `/judges` Qloo usage map > done.

**J2. Health worker on a phone:** Opens the link > "Try the live demo" > the example is pre-filled with her county > changes the audience > taps Run > watches the steps > switches to List > taps a venue > "Add to my week" > downloads the calendar file.

**J3. Outreach lead on a laptop:** `/app` > chooses county and audience > More options: top share 15%, Saturdays > uploads `partner_venues.csv` (validation report) > Run > reviews the map with need and trust layers > removes 2 venues > exports CSV and GeoJSON > opens the owner pitch pack > ticks "I have reviewed this" > downloads the PDF.

**J4. Developer:** `/developers` > creates an API key > copies the curl example > runs it > adds the MCP config to Claude Desktop > asks Claude "find outreach venues in Cook County for adults 55 and older".

## 3. Site map

As in DESIGN_SYSTEM.md section 3: `/`, `/app`, `/how-it-works`, `/proof`, `/research`, `/developers`, `/judges`, `/safety`, `/glossary`.

## 4. Landing page: final copy

### 4.1 Hero

- Eyebrow: `PUBLIC HEALTH OUTREACH, POWERED BY TASTE DATA`
- **Headline:** Find the barbershops of every community.
- **Sub-headline:** Anchor shows health workers where high blood pressure goes untreated, and which local places people there already love and trust, so free health checks happen where people actually are.
- Primary button: **Try the live demo**
- Secondary button: **See how it works (60 sec)**
- Small line under the buttons: Built on Qloo's taste data, CDC public health data and a landmark study in the *New England Journal of Medicine*. Free and open source.
- Visual: a calm map of Los Angeles with soft blue need shading, 5 pins and one open card reading "Example Barber Studio: loved by men aged 35 to 54 here. Open Saturdays." The pins are not real recommendations in the hero image; this is labelled "Illustration".

### 4.1b Impact band and impact section (built Oct 17)

Directly under the hero, a full-width band of 4 numbers, each with an info button: **5.4x** more men controlled (measured), **about half** the strokes if the drop lasts (estimate), **684,000** untreated adults in LA County (CDC model estimate), **894** licensed barbershops and salons in the 20 highest-need zones (count, City of LA only). The hero itself also carries one callout line: "When pharmacists came to the barbershop, 5 times as many men got their blood pressure under control. Anchor finds the right places to do that in every community."

After the research section, an impact section titled "A proven way to prevent strokes is stuck in one city. Anchor tells you where to take it next." It has four cards (It works, 5.4x; It saves lives, about half; It is stuck, 1 city; Anchor unlocks it, any county) and an outcomes table labelled "(estimate)", with the method in plain words underneath. Numbers and sources: [RESEARCH.md](RESEARCH.md) section 3b.

### 4.2 The problem in 3 numbers

Section title: **Blood pressure medicine works. It is just not reaching people.**

| Stat card | Big number | Meaning | Source (info button and link) |
|---|---|---|---|
| 1 | **120 million** | US adults with high blood pressure, about half of all adults. | CDC, High Blood Pressure Facts |
| 2 | **1 in 4** | Of them have it under control. | CDC, same page |
| 3 | **680,179** | Deaths in 2024 where high blood pressure was a cause. | CDC, same page |

Line under the cards: High blood pressure usually has no symptoms, so people who feel fine don't come in. Care has to go to them.

### 4.3 The research

Section title: **What happened when health care went to the barbershop**

Study card:
- **The question:** Can barbershops help men get high blood pressure under control?
- **What they did:** 52 barbershops in Los Angeles were split into two groups by chance. In one group, barbers encouraged customers to meet a pharmacist right there in the shop.
- **What happened:** **63.6%** of men reached a healthy blood pressure, against **11.7%** in the other group.
- **What it means for Anchor:** Going to trusted places works. But every community has its own trusted places, and nobody has a map of them. Anchor makes that map.
- Citation line: Victor et al., *New England Journal of Medicine*, 2018. [Read the study] [Our research page]

### 4.4 How it works in 4 steps

Section title: **How Anchor builds a plan**

1. **Tell it who and where.** Choose a goal (like free blood pressure checks), an age group and a county. (info: `step-who-where`)
2. **It finds the need.** CDC data shows the neighbourhoods where the most adults have high blood pressure and no medicine. (info: `step-need`)
3. **It finds the trust.** Qloo shows which local places that age group loves in those neighbourhoods: barbershops, salons, cafes, gyms and more. (info: `step-trust`)
4. **It checks and plans.** Every place is checked on OpenStreetMap, ranked by a clear formula, and turned into a visit schedule, invitations and files. (info: `step-plan`)

Diagram: four connected cards, Need (map icon), Trust (heart-pin icon), Check (shield icon), Plan (calendar icon).

### 4.5 Why Qloo, and not just AI

Section title: **The same question, two answers**

The request: *"Where should we hold free blood pressure checks for men aged 35 to 54 in South Los Angeles?"*

| AI alone | Anchor with Qloo |
|---|---|
| Suggests "local barbershops, churches and community centres", with no names, or names that may not exist. | Names 12 specific, verified places, each in a high-need neighbourhood. |
| Has no idea which neighbourhoods need it most. | Uses CDC estimates for every census tract. |
| Guesses what people like from stereotypes. | Uses Qloo data on what this age group actually loves, place by place, with no personal data. |
| Cannot show its evidence. | Every place has "Why this place" and "Show evidence". |

Note under the table: In our test, [B1 existence rate]% of the AI-only suggestions could be confirmed as real places. Anchor: 100%. (Filled from `results.json`.)

### 4.6 See it work

Section title: **An example plan for Los Angeles County**

An embedded, pre-run example: map plus top 5 venue cards, the "agent steps" log collapsed, and a button **Open this plan in the app**. Caption: This example was generated by Anchor on [date]. Open it to see every step and source.

### 4.7 Proof

Section title: **We tested it against the obvious alternatives**

Headline card (negative control first): **0 invented places. 0 bars or liquor stores. 0 targeting by race.** (info: `proof-negative`)

Table (filled from `results.json`, live run Oct 20; the page reads the file directly):

| | Anchor | AI alone | Map search | Qloo without need data |
|---|---|---|---|---|
| Places in the highest-need neighbourhoods | 100% | 61% | 18% | 7% |
| Places confirmed to exist | 100% | 41% | 100% | 100% |
| Unsuitable places (bars, liquor, cannabis) | 0% | 0% | 5% (any business) | 14% |
| Kinds of places found | 9.9 | 11.8 | 2 | 9.8 |
| Lists that differ by audience (average overlap) | 11.5% | 36.5% | n/a | n/a |

Line: Tested on all 8 of Los Angeles County's official planning areas, for 2 age groups. [See the full method] [Rerun it yourself]

Practitioner quote block (once obtained): "[Quote]" [Name, role, organisation]

### 4.8 Who it is for

| Card | Text | Link |
|---|---|---|
| Health workers | Get a short list of places to visit, the best days and what to say. Works on your phone. | Try the demo |
| Health departments and health plans | See need and trust on one map. Export to Excel, GIS and calendars. Bring your own data. | Open the app |
| Developers and AI agents | Use Anchor from your own software with our API, or from Claude and other agents with MCP. | Developer docs |
| Judges | A 3-minute tour of what we built, how it uses Qloo and how to check every claim. | Judge mode |

### 4.9 Use it your way

| Option | Simple words | Technical detail (shown with the Technical switch) |
|---|---|---|
| Web app | Use it in your browser. No sign-up. | Next.js app, works on phones and desktops |
| Bring your own data | Add your own list of partner places or your own area numbers. Files stay on your device unless you choose to use them. | CSV, XLSX, GeoJSON; parsed in the browser; personal data guard; small-cell rule |
| API | Let your software ask Anchor for plans automatically. | REST, OpenAPI 3.1, `POST /api/v1/plans`, Bearer keys, demo key `anc_demo` |
| AI agents (MCP) | Let Claude and other AI assistants use Anchor as a tool. | Remote MCP at `/api/mcp`, tools `anchor_find_venues` and others |
| Bring your own Qloo key | Use your own Qloo account for heavy use. | `X-Qloo-Key` header; never stored or logged |

Code sample (Technical only): the curl request from TECHNICAL_DESIGN.md section 10.1.

### 4.10 Safety and limits

Section title: **What Anchor does and does not do**

- **It never targets people by race, ethnicity or religion.** It plans by neighbourhood need, age and gender only. We tested this with 30 tricky requests and publish the result.
- **It uses no personal data.** No patient records, no names, no tracking.
- **It does not give medical advice.** Health wording comes from vetted public health sources, and a person must review every flyer before it is shared.
- **Its numbers are estimates.** CDC neighbourhood figures come from a national survey and statistical models. Qloo shows what groups of people love, not how many walk through a door.
- [Read the full safety page]

### 4.11 FAQ (accordion)

1. **Is Anchor free?** Yes. It is free to use and open source under the MIT licence.
2. **Do I need an account?** No. The app works without signing up. Developers can create a free API key with one click.
3. **What is Qloo?** A company that knows what people like across music, film, food, places and more, built from large-scale anonymous data. Anchor uses it to learn which places a group of people loves.
4. **Does Anchor use anyone's personal information?** No. It works with neighbourhoods, age groups and venues, never individuals.
5. **Why don't you let me target by race or ethnicity?** Guessing race from people's tastes is unreliable and can harm communities. Need data already shows where help is needed most, so we plan by need, age and gender.
6. **How do you know the places are real?** Every place is checked against OpenStreetMap, a public map. If a place cannot be confirmed, we either mark it clearly or remove it.
7. **Why barbershops?** A 2018 study found that pairing barbers with pharmacists helped far more men get their blood pressure under control. Anchor also finds other kinds of trusted places, because every community is different.
8. **Can I use my own data?** Yes. Upload your own partner list, area numbers, service area or team locations. They are checked on your device first.
9. **Which places in the US does it cover?** Any US county, because CDC data covers every county. Our tested example is Los Angeles County.
10. **Can Anchor be used for other health goals?** Yes. The same approach works for cancer screening, vaccines and diabetes checks. The research for those is listed on the research page.
11. **Who made this?** [Team name], for the Qloo Agentic Hackathon 2026.

### 4.12 References

Numbered list from RESEARCH.md section 7, each with a DOI link.

### 4.13 Footer

MIT licence | GitHub | Data: CDC PLACES (public domain), US Census, © OpenStreetMap contributors | Powered by Qloo | Not medical advice | Contact

## 5. App screens

### 5.1 Desktop (1440 px)

```
+--------------------------------------------------------------------------------------+
| Anchor   App  How it works  Proof  Research  Developers  Judges   [Simple|Tech] [Sun] |
+-------------------------+--------------------------------------+---------------------+
| PLAN SETTINGS           |                                      | VENUE DETAILS       |
| Goal  [Free BP checks v]|   MAP                                | Example Barber Std. |
|   (i)                   |   need shading (blue scale)          | #1  Score 0.81 (i)  |
| Who   [Men] [35 to 54 v]|   numbered pins                      | Why this place (i)  |
|   (i)                   |   legend (i)  layers: Need/Trust (i) |  "Loved by men aged |
| Where [Los Angeles Co. ]|                                      |   35 to 54 here..." |
|   (i)                   |                                      | Need here: 4,120    |
| More options v          |                                      |  adults (i)         |
| [Run plan]              |                                      | Open: Sat, Fri      |
|-------------------------|                                      | Verified on map (i) |
| AGENT STEPS (i)         |                                      | [Add to plan]       |
| 1 Finding need... done  |                                      | [Show evidence]     |
| 2 Asking Qloo... 12/18  |                                      | [Draft invitation]  |
| 3 Checking map...       |                                      |                     |
|-------------------------|                                      |                     |
| RESULTS  [Map|List]     |                                      |                     |
| 1 Example Barber  0.81  |                                      |                     |
| 2 ...                   |                                      |                     |
| [Export v] (i)          |                                      |                     |
+-------------------------+--------------------------------------+---------------------+
```

### 5.2 Phone (390 px)

```
+------------------------------+
| Anchor        [Tech] [Sun] = |
+------------------------------+
| Plan for: Men 35 to 54,      |
| Los Angeles County  [Edit]   |
+------------------------------+
|            MAP               |
|   (need shading, pins)       |
|                              |
+------------------------------+
| ^ 12 places found (drag up)  |  <- bottom sheet
| 1 Example Barber Studio      |
|   Loved here. Open Sat.  (i) |
| 2 ...                        |
+------------------------------+
| [Map] [List] [Plan] [Export] |  <- bottom navigation, 56 px
+------------------------------+
```

Tapping a venue opens a full-height sheet with the same content as the desktop detail panel. The primary button sits at the bottom, inside the thumb zone.

### 5.3 States

| State | What the user sees |
|---|---|
| **Empty (first visit)** | Settings pre-filled with the example (Los Angeles County, men 35 to 54, free BP checks), plus a card: "This example is ready. Press Run plan to see Anchor work, or change anything first." |
| **Loading** | The agent steps panel streams each step with a count and a tick. Map skeleton within 100 ms. Each step has a plain sentence, for example "Asking Qloo which places men aged 35 to 54 love in 18 high-need neighbourhoods (12 of 18 done)". |
| **Partial** | If the call budget runs out: "We found 9 strong places before reaching today's limit. They are ready to use. Run again later for more." |
| **Error, Qloo down** | "Qloo did not answer in time. Your settings are saved. [Retry] or [Open the saved example]." |
| **Error, no results** | "No suitable places found in these neighbourhoods for this group. Try a wider age range, or include more neighbourhoods (More options > Top share)." |
| **Success** | A summary card first: "12 places in 7 high-need neighbourhoods. 10 are open on Saturdays. 3 places were removed (2 bars, 1 not found on the map). [See why]" |
| **Policy reframe** | If someone types a race-based request: "Anchor plans by neighbourhood need, age and gender, not race or ethnicity. Here is a plan for the highest-need neighbourhoods instead. [Why we do this]" |

## 6. Info button inventory

Every entry follows the format: what it is, why it matters, where it comes from.

| id | Where | What it is | Why it matters | Source |
|---|---|---|---|---|
| `hero-qloo` | Hero line | Qloo is a data company that knows what people like, without personal data. | It is how Anchor knows which places a group loves. | qloo.com, our /research |
| `stat-120m` | Stat 1 | Adults with blood pressure of 130/80 or higher, or on BP medicine. | Shows how common the problem is. | CDC facts page |
| `stat-1in4` | Stat 2 | The share whose blood pressure is back in a healthy range. | Most people are not controlled, so reach matters. | CDC |
| `stat-deaths` | Stat 3 | Deaths in 2024 where high blood pressure was a main or contributing cause. | Shows what is at stake. | CDC |
| `study-card` | Research | A randomised trial in 52 LA barbershops. | It is the strongest evidence that trusted places work. | *NEJM* 2018 |
| `step-who-where` | Step 1 | Your goal, the age group and gender, and the county. | Anchor plans for real places and real people. | n/a |
| `step-need` | Step 2 | CDC estimates for every neighbourhood. | Puts effort where the most people are untreated. | CDC PLACES |
| `step-trust` | Step 3 | Qloo's data on places a group loves. | People go where they already feel welcome. | Qloo |
| `step-plan` | Step 4 | Checking, ranking, scheduling and drafting. | Turns data into a plan someone can carry out. | Our method page |
| `input-goal` | App, goal | What you want to offer, for example free BP checks. | Shapes the invitations and suggested venue types. | n/a |
| `input-age` | App, age | The age group you want to reach. | Qloo tastes differ a lot by age. | Qloo age groups |
| `input-gender` | App, gender | Optional. Men, women or everyone. | The NEJM trial focused on men; you can choose. | n/a |
| `input-county` | App, where | Any US county. | CDC data covers every county. | CDC PLACES |
| `opt-topshare` | More options | How many neighbourhoods count as "highest need" (default: top fifth). | Smaller means more focused, larger means more coverage. | Our method |
| `opt-days` | More options | Days you prefer to hold events. | Places open on those days rank higher. | Qloo opening hours |
| `agent-steps` | Steps panel | A live log of what the AI agent is doing. | You can see how the plan is made, step by step. | Our trace |
| `layer-need` | Map legend | Darker blue means more adults with untreated high BP (estimate). | Shows where help is needed most. | CDC PLACES |
| `layer-trust` | Map layer toggle | Where this group's favourite places cluster. | Shows where trust is. | Qloo heatmap |
| `score-anchor` | Venue card | A 0 to 1 score combining need, trust, evidence and practicality. | Lets you compare places fairly. | Formula on /how-it-works |
| `why-place` | Venue card | A plain explanation of why this place was chosen. | You can judge it with your own knowledge. | Qloo explainability plus CDC |
| `need-here` | Venue card | Estimated adults nearby with high BP and no medicine. | Shows the size of the opportunity. | CDC PLACES |
| `verified` | Venue card | The place was found on OpenStreetMap at this address. | Prevents wasted trips to places that don't exist. | OpenStreetMap |
| `evidence` | Venue card | The exact data calls behind this place. | Anyone can check our work. | Trace ledger |
| `removed` | Results summary | Places we removed and why (for example bars). | Health events should not happen in alcohol venues. | OSM and Qloo tags |
| `export` | Export menu | Files for spreadsheets, maps, calendars and print. | Plans fit into tools you already use. | n/a |
| `owner-pitch` | Materials | A one-page invitation for the venue owner. | Makes the first conversation easy. | Template plus vetted health facts |
| `review-required` | PDF export | You must review drafts before sharing. | AI drafts can be wrong; a person stays in charge. | Our safety policy |
| `byod-upload` | Upload | Add your own data; it is checked on your device first. | Use what you already know. | PLATFORM.md section 9 |
| `byod-smallcell` | Upload report | Numbers from 1 to 10 are hidden. | Protects privacy in small groups. | Small-cell rule |
| `byok` | Advanced | Use your own Qloo key. | For heavy use with your own quota. | PLATFORM.md section 8 |
| `api-key` | Developers | A secret code that lets your software use Anchor. | Keeps usage fair and safe. | PLATFORM.md section 7 |
| `mcp` | Developers | A standard way for AI assistants to use tools. | Lets Claude and others use Anchor directly. | Model Context Protocol |
| `proof-negative` | Proof | Things Anchor must never do, measured. | Trust comes from what a tool refuses to do. | `results.json` |
| `proof-baselines` | Proof | The simpler alternatives we compared against. | Shows Anchor adds real value. | Eval method |
| `race-policy` | Safety | Why we don't target by race or ethnicity. | Prevents stereotyping and harm. | Our policy |

## 7. Simple vs Technical examples

| Section | Simple | Technical (added) |
|---|---|---|
| Step 2: Need | "CDC data shows the neighbourhoods where the most adults have high blood pressure and no medicine." | "`untreated_t = BPHIGH_t x adults_t x (1 - BPMED_t)`; `need_t = 0.5 pct(untreated) + 0.5 pct(BPHIGH)`; top 20% merged into zones via polygon union, simplified to 60 vertices. Source: PLACES 2025 (`yjkw-uj5s`)." |
| Step 3: Trust | "Qloo shows which local places that age group loves." | "`GET /v2/insights?filter.type=urn:entity:place&filter.location=<WKT>&signal.demographics.age=35_to_44,45_to_54&signal.demographics.gender=male&feature.explainability=true&take=50`" |
| Venue score | "A score from 0 to 1 that combines need, trust, evidence and practicality." | The full formula from TECHNICAL_DESIGN.md section 6, with this venue's values filled in. |

## 8. Glossary (`/glossary`)

Affinity; Agent; API; API key; BYOD (bring your own data); BYOK (bring your own key); CDC; CDC PLACES; Census tract; Community health worker; Controlled blood pressure; County FIPS code; Evidence (trace); Explainability; GeoJSON; Heatmap; High blood pressure (hypertension); ICS file; MCP (Model Context Protocol); OpenStreetMap; Outreach; Randomised trial; Small-cell rule; Systolic blood pressure; Taste graph; Zone.

Each entry: a one-sentence definition in plain words, an example, and a link to where it appears on the site.

## 9. Microcopy

| Element | Text |
|---|---|
| Primary run button | Run plan |
| Re-run after edits | Update plan |
| Add venue | Add to plan |
| Remove venue | Remove (with an Undo toast: "Removed. Undo") |
| Export menu | Download: Spreadsheet (CSV), Map file (GeoJSON), Calendar (ICS), Invitations (PDF) |
| Review tick | I have read these drafts and they are right for my community. |
| Upload area | Drop a file here, or choose one. CSV, Excel or GeoJSON. Checked on your device first. |
| Personal data block | This file looks like it has information about individual people. For their safety, we only accept area-level or venue-level data. Remove these columns and try again: [columns]. |
| Rate limit | You've reached today's free limit for live plans. You can still open saved plans and the example. Limits reset at midnight UTC. |
| Offline banner | Live data is temporarily unavailable. You are seeing a saved example. |

## 10. First-run guided tour (4 steps, dismissible, reopen from Help)

1. **Settings:** "Tell Anchor what you want to offer, to whom and where. We filled in an example for you."
2. **Run and watch:** "Press Run plan. You'll see each step the AI agent takes."
3. **Results:** "Each place has a reason and evidence. Tap one to see why it was chosen."
4. **Export:** "Download your plan for your calendar, spreadsheet or map tool."

## 11. Accessibility specifics

- The map always has a list twin with identical content and order; the screen reader announces "Map, also available as a list below."
- Pins use numbers as well as colour; the need scale is single-hue blue and passes colour-blind simulation.
- Agent steps use an `aria-live="polite"` region, announcing at most one update every 2 seconds to avoid noise.
- All bottom sheets trap focus correctly, close on Escape, and return focus to the trigger.
- Exports are labelled with the file type and size.

## 12. Light and dark specifics

- Map styles: a light Protomaps style for light mode and a dark one for dark mode, switched with the theme. The need shading is recomputed per theme so that contrast with the base map stays at least 3:1 for the darkest class.
- Pins: accent fill with a white or near-black outline per theme, so they are visible on every class.
- PDF exports always use the light theme for printing.
