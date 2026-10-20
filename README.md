# Anchor

**Find the barbershops of every community.**

Anchor helps community health workers decide where to hold free blood pressure checks. It finds the neighbourhoods where the most adults have high blood pressure without medicine (CDC data), then the local places people there already trust: licensed barbershops and salons from city records, and the places each age group loves, from Qloo.

Built for the Qloo Agentic Hackathon 2026. **Live: https://anchor-gamma-woad.vercel.app** (judge mode: [/judges](https://anchor-gamma-woad.vercel.app/judges)).

## Why it matters

- When pharmacists met men in their barbershops, **63.6%** got their blood pressure under control, against **11.7%** with usual care (*New England Journal of Medicine*, 2018).
- Applying the size of that drop to large trials of blood pressure treatment suggests about half of strokes could be prevented if the effect lasts (estimate, *Lancet* 2016 meta-analysis).
- A follow-up study reports that the programme never spread. The people in it said success came from a trusted place and a trusted person. Anchor finds those places for any group of residents.

## Proof, measured

| | Anchor | AI alone (same model, no tools) | Map search |
|---|---|---|---|
| Places in the highest-need fifth of neighbourhoods | **100%** | 61% | 18% |
| Places confirmed in a city licence or a Qloo listing | **100%** | 41% | 100% |
| Bars and liquor stores | **0%** | 0% | 5% (any business) |

All 35 safety tests pass: no targeting by race, ethnicity, religion or origin; no bars; no medical advice. Every number reruns with `npm run eval`.

## Where things are

| Folder | Contents |
|---|---|
| [anchor-app/](anchor-app/) | The app, API, MCP server, data pipeline, evaluation and tests. Start with its [README](anchor-app/README.md). |
| [anchor/](anchor/) | Research, plan, technical design, and UX and content guide |
| [shared/](shared/) | Design system, platform design, rules compliance and tools coverage |
| [LINKS.md](LINKS.md) | Hackathon and Qloo API links |

## Run it

```bash
cd anchor-app
npm install
cp .env.example .env.local     # optional: QLOO_API_KEY, ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

Without keys the app runs in offline mode and says so on every plan.

## Licence and data

Code: MIT, see [LICENSE](LICENSE). Data: CDC PLACES and US Census (public domain), City of Los Angeles business licences (CC0). Qloo data is used under the hackathon terms and is never stored in this repository.

Not medical advice.
