# Kill test K1: does Qloo know the barbershops and salons in high-need zones?

Run: 2026-10-19T20:11:55.388Z. Zones: top 5 in Los Angeles County by estimated untreated adults.
Ground truth: City of LA active business licences, NAICS 812111 (barber shops) and 812112 (beauty salons).

| Zone | Est. untreated adults | Licensed barbers and salons | Qloo places returned | Licensed ones Qloo knows |
|---|---|---|---|---|
| z06037-001 | 4,714 | 60 (34 barbers) | 73 | 1 |
| z06037-002 | 4,077 | 90 (55 barbers) | 93 | 2 |
| z06037-003 | 4,045 | 140 (69 barbers) | 153 | 17 |
| z06037-004 | 3,098 | 9 (6 barbers) | 140 | 0 |
| z06037-005 | 2,832 | 42 (29 barbers) | 90 | 0 |

**Verdict:** FAIL: Qloo knows 6%. Check name matching by hand on 20 cases before switching to Hooked.

Notes:
- City licences cover the City of Los Angeles only. Zones that cross into other cities (for example Inglewood) undercount.
- 'Active' means the owner has not reported closing, so some licensed businesses may have closed.
- A match is the same normalised name within 150 m, or the same house number within 100 m. Spot-check misses by hand.
- Source: City of Los Angeles Office of Finance, Listing of Active Businesses (data.lacity.org, 6rrh-rzua), CC0.

## Diagnosis (Oct 19, 2026), by hand

**Why the match rate is 6%.** Not a name-matching problem: Qloo returns **zero** places for the barber shop, hair salon or beauty salon category tags inside zone 1, and zero within 3 km of its centre. Across the whole city of Los Angeles, the same tags return about 40 places each, mostly well-known or upscale ones (for example Blind Barber, Legends Barbershop on Fairfax, salons in Beverly Hills). Qloo's place data does not cover small neighbourhood barbershops and salons in South Los Angeles.

**What Qloo does cover there.** The 50 most popular places in zone 1 are restaurants (Mexican, soul food, fried chicken, burgers), bakeries, seafood and grocery markets, and parks. Examples: Dulan's (soul food), M'Dears Bakery & Bistro, Jim Dandy Fried Chicken, Jesse Owens Park, Superior Grocers.

**Kill test K2 (does the audience change the result?).** `sort_by=affinity` did not change the order: three audiences got an identical top 20. But the affinity values differ a lot by audience (mean absolute difference 0.17 per place across 20 places). Examples, men 35 to 54 vs women 55+: M'Dears Bakery 0.94 vs 0.55, Tam's Burgers 0.90 vs 0.64, Jesse Owens Park 0.71 vs 0.80, Ralphs 0.68 vs 0.80. **Verdict: PASS, if Anchor re-ranks Qloo's candidates by affinity itself.**

**Kill test K3 (explainability).** With age and gender signals only, Qloo returns the warning "Could not calculate explainability". It appears to need entity signals. **Verdict: FAIL for the demographic query**; reasons must come from Qloo's place tags and affinity instead.

**Rate limits** (response headers): 5 requests per second, 10,000 per month. The client now throttles to 4 per second.

**Hooked K1 (for comparison).** Minecraft + Bluey as signals for `urn:entity:book` returned 15 real children's books with affinity 0.82 to 0.87, led by the Wings of Fire series. **PASS**, though results need a per-series variety rule.
