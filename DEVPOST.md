# Anchor: find the barbershops of every community

**Tagline:** Maps where blood pressure goes uncontrolled, finds the places those neighbours love, and hands health workers a verified outreach plan.

**Try it:** https://anchor-gamma-woad.vercel.app (no sign-up). The landing page explains the project in 30 seconds and lets you make a real plan right there, watching each step run. Judge mode, a 3-minute tour with a way to check every claim: https://anchor-gamma-woad.vercel.app/judges
**Code:** https://github.com/usv240/anchor (MIT licence)

---

## What it does

When pharmacists met Black men in their barbershops, **63.6%** got their blood pressure under control, against **11.7%** with usual care (*New England Journal of Medicine*, 2018). A drop that size, if it lasts, could prevent about half of strokes. But the programme never spread beyond the study. In follow-up interviews, the barbers, customers and pharmacist said success came from a trusted place and a trusted person, and that spreading it depends on finding those places.

Anchor finds them. A community health worker picks an age group, a gender and a county. Anchor then:

1. **Finds the need.** It finds the neighbourhoods where the most adults have high blood pressure and take no medicine, from CDC estimates for every census tract.
2. **Finds the trust.** It asks Qloo which local places that group loves inside each of those neighbourhoods, and adds the licensed barbershops and salons the trial tested.
3. **Checks every place.** Each place must sit inside a real high-need tract and match a city business record or a Qloo listing. Bars, liquor stores and smoke shops are removed.
4. **Plans the work.** It ranks places with a published formula and spreads them across neighbourhoods. It then builds a visit schedule, an invitation letter for each owner, talking points and downloads (spreadsheet, calendar, map file).

Every step is streamed live, recorded in a tamper-evident log, and explained by an info button.

## Why it needs Qloo

We measured it. Without Qloo, Anchor can only pick from business licences by type and age. With Qloo, each audience gets its own trusted places.

| Measured on 16 live requests in Los Angeles County | Anchor | AI alone (same model, no tools) | Map search | Qloo without need data |
|---|---|---|---|---|
| Places in the highest-need fifth of neighbourhoods | **100%** | 61% | 18% | 7% |
| Places confirmed in a city record or a Qloo listing | **100%** | 41% | 100% | 100% |
| Bars, liquor stores and similar | **0%** | 0% | 5% (any business) | 14% |
| Overlap between lists for different audiences | **11.5%** | 36.5% | n/a | n/a |
| Share of a place's 20 strongest fan areas that are high need | **33.5%** | n/a | n/a | 17.8% |

- **Neither half works alone.** Qloo alone sends only 7% of its picks to high-need areas. Need data alone cannot say which places people love.
- **It is not one list for everyone.** Lists for men and for women aged 35 to 54 had no place in common. AI alone gave different audiences far more alike lists (36.5% overlap), mostly churches, parks and malls.
- **Fan reach.** We ask Qloo where each place's fans are concentrated, using a heatmap with that place as the signal. For Anchor's places, a third of the strongest fan areas are high-need neighbourhoods. That is well above chance (1 in 5) and nearly twice the rate for Qloo's top places without need data.
- **Second county.** The same method, run unchanged on San Francisco's public business register, puts 100% of places in high-need neighbourhoods, against 18% for a map search.

## How Anchor uses Qloo

| Qloo capability | What it does in Anchor |
|---|---|
| Place insights inside a zone polygon, with age and gender signals | The places a group loves in each high-need neighbourhood, re-ranked by that group's affinity (top third only) |
| Demographic insights | A "Who loves this place" chart on every Qloo place |
| Heatmap with an audience as the signal | Taste map next to the need map |
| Heatmap with one place as the signal | Fan reach: does this place draw people from high-need areas? |
| Taste analysis (tags) | Talking points for flyers and conversations, with identity, belief and alcohol topics always removed |
| Book insights from kids' interests, children's genres only, with explainability | A reading corner for barbershop waiting areas. Each book is checked with Open Library, and the panel flags interests that shaped no books |
| Search and tags | Real Qloo ids only; also used to check the AI-alone baseline fairly |
| Official Qloo harness (MCP) | Backup route for audience charts, fan reach and talking points, and a cross-check: 40 of 40 values identical to Anchor's own client |

We also tested the rest of the API and recorded why each part is left out. Interest audiences moved affinity by only 0.05. Explainability returns nothing for demographic-only place queries. Trending does not cover places. The harness's recommend tool takes only named areas, not a polygon.

## Use it your way

- **Web app:** phone or desktop, light or dark, Simple or Technical wording.
- **Bring your own data:** upload the places your team already works with. Anchor shows how many are in high-need neighbourhoods and puts those first. Files with columns about people are refused.
- **Bring your own key:** use your own Qloo key for one plan. It is never stored.
- **Use it as a service:** a free API key in one click on the landing page, with a ready example. Keys are signed, so nothing about them is stored. REST API with OpenAPI 3.1 and a public demo key.
- **MCP server** with 5 tools, so Claude and other AI assistants can plan outreach, check fan reach and build reading lists.

## Safety and limits

- **35 of 35 safety tests pass**, run through the real system:
  - 20 requests to target people by race, ethnicity, religion or origin are planned by need instead.
  - 5 look-alike ordinary requests (such as "Koreatown") are left alone.
  - 5 attempts to get bars into a plan fail.
  - 5 requests for medical advice are declined by the AI agent and checked by a separate AI judge.
- **Honesty notes are published.** The targeting guard was fixed after its first run missed one prompt. The medical word check was too strict on its first run and was fixed in the open.
- **What the data cannot tell you:**
  - CDC figures are model-based estimates.
  - Qloo affinity shows what a group likes, not how many people visit.
  - City registers miss some businesses.
  - The health effect comes from the programme, not from Anchor.
- **No personal data.** Anchor plans by neighbourhood, age group and gender, never individuals. Sole traders listed under their own name are removed from venue lists. It is not medical advice.

## How we built it

- **App:** Next.js 16, React 19, TypeScript and Tailwind.
- **Agent:** Claude Opus 5.5 with strict tool schemas and server-side fallback. A deterministic basic planner takes over if the model is unavailable, and every plan says which one ran.
- **Ranking:** the model never ranks. A published formula does.
- **Qloo client:** a parameter guard, call budget, rate limiting, a private cache and a daily allowance for the shared keys.
- **Data pipeline:** Python with geopandas, building CDC PLACES 2025 tracts, US Census boundaries, and the Los Angeles and San Francisco business registers.
- **Evaluation:** one command reruns every published number (`npm run eval`). There are 260+ automated tests, including tests that keep the writing plain (no jargon, no dashes) and every info button filled.

## What's next

- **More counties.** Each one needs only an open business register.
- **Follow-up visits.** Track checks and referrals per venue.
- **A pilot.** Run it with a county health department and measure reach.

## References

1. Victor RG et al. A cluster-randomized trial of blood-pressure reduction in Black barbershops. *N Engl J Med* 2018;378:1291-1301.
2. Ettehad D et al. Blood pressure lowering for prevention of cardiovascular disease and death. *Lancet* 2016;387:957-967.
3. Kohrman N et al. Post-hoc interviews with participants of the Los Angeles Barbershop Blood Pressure Study. *PLoS One* 2024;19(5):e0303075.
4. Chong S et al. Preferences of Black male barbershop patrons on receiving health care in nontraditional settings. *Health Equity* 2023;7(1):835-842.
5. Yusuf IA et al. Community health worker-led interventions on cardiometabolic outcomes: a meta-analysis. *PLOS Global Public Health* 2026.
6. CDC PLACES 2025 release; US Census cartographic boundaries 2023; City of Los Angeles Listing of Active Businesses (CC0); San Francisco Registered Business Locations (public domain).

**Built with:** qloo, claude, anthropic, nextjs, react, typescript, tailwindcss, mcp, python, geopandas, cdc-places, vercel
