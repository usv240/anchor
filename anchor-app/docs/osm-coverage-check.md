# OpenStreetMap coverage check (Oct 16, 2026): too sparse to use as ground truth

Run: 2026-10-16T13:43:09.722Z. Zones: top 5 by estimated untreated adults (LA County).

| Zone | Est. untreated adults | OSM hair venues (named) | Qloo places returned | OSM venues also in Qloo |
|---|---|---|---|---|
| z06037-001 | 4,714 | 2 (0 barbers) | not run (no key) | n/a |
| z06037-002 | 4,077 | 0 (0 barbers) | not run (no key) | n/a |
| z06037-003 | 4,045 | 22 (4 barbers) | not run (no key) | n/a |
| z06037-004 | 3,098 | 6 (2 barbers) | not run (no key) | n/a |
| z06037-005 | 2,832 | 0 (0 barbers) | not run (no key) | n/a |

**Verdict:** PENDING: run again with QLOO_API_KEY set.

Notes: a single Qloo page holds at most 50 places, so a low match rate in a dense zone may mean we need
category tags (filter.tags) or more pages, not missing coverage. Re-run with tags before deciding.
OpenStreetMap data (c) OpenStreetMap contributors, ODbL.
