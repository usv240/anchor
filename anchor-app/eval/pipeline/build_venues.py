"""Build Anchor's local venue list for one county from open business licences.

Source: City of Los Angeles Office of Finance, Listing of Active Businesses
(data.lacity.org 6rrh-rzua, CC0). Covers the City of Los Angeles only.

Each licensed business inside a high-need zone becomes a candidate venue with:
  category (plain words), evidence weight, suitability flag (bars, liquor
  stores and similar are never outreach venues), years in business.

Output: data/derived/<county>/venues.json (public-domain derived data, safe
to commit; no Qloo data here).

Usage:
    uv run python pipeline/build_venues.py --county 06037
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.prepared import prep
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[2]

# NAICS 2007 code -> (category in plain words, evidence weight, suitable?)
# Evidence weights follow anchor/TECHNICAL_DESIGN.md section 6: 1.0 for venue
# types tested in trials (barbershops, salons), 0.8 for everyday community
# places, 0.6 otherwise. Unsuitable venues are kept only to count them as
# the negative control.
CATEGORIES: dict[str, tuple[str, float, bool]] = {
    "812111": ("Barbershop", 1.0, True),
    "812112": ("Beauty salon", 1.0, True),
    "812113": ("Nail salon", 0.8, True),
    "812310": ("Laundromat", 0.8, True),
    "713940": ("Gym or sports centre", 0.8, True),
    "722110": ("Restaurant", 0.8, True),
    "722511": ("Restaurant", 0.8, True),
    "722211": ("Quick-service restaurant", 0.8, True),
    "722513": ("Quick-service restaurant", 0.8, True),
    "445110": ("Grocery store", 0.8, True),
    "451220": ("Record store", 0.6, True),
    "722410": ("Bar", 0.0, False),
    "445310": ("Liquor store", 0.0, False),
}

# A licence with no trading name whose legal name has no business words is most
# likely a sole trader under their own personal name (often a booth renter or a
# home address). Anchor never lists private individuals as outreach venues.
BUSINESS_WORDS = re.compile(
    r"\b(inc|llc|corp|co|ltd|lp|company|group|enterprises?|salon|salons|barber|barbers|barbershop|shop|"
    r"studio|cuts|kutz|fade|fades|beauty|nails?|spa|hair|lash|brow|market|mercado|carniceria|grocery|"
    r"groceries|store|stores|supermarket|foods?|kitchen|restaurant|cafe|café|coffee|grill|taco|tacos|"
    r"taqueria|pizza|burger|burgers|bakery|panaderia|deli|bbq|chicken|wings|donuts?|tea|juice|"
    r"laundry|laundromat|cleaners|wash|fitness|gym|boxing|yoga|sports|records?|music|imports?|express|"
    r"house|place|corner|center|centre|club|bar|lounge|bistro|eatery|diner|cocina|mariscos|pupuseria)\b",
    re.IGNORECASE,
)


def looks_like_person(row: dict) -> bool:
    if (row.get("dba_name") or "").strip():
        return False
    legal = (row.get("business_name") or "").strip()
    if BUSINESS_WORDS.search(legal) or re.search(r"\d", legal):
        return False
    words = [w for w in re.split(r"[\s,]+", legal) if w]
    return 2 <= len(words) <= 4


# Outreach needs a shopfront people visit. Apartment addresses and mobile or
# home-service names (make-up artists, mobile barbers) are not venues.
RESIDENTIAL_ADDRESS = re.compile(r"\b(apt|apartment)\b", re.IGNORECASE)
MOBILE_NAME = re.compile(
    # "makeup" and "artist" can sit inside one word (for example "Jspotmakeup"), so no leading boundary there.
    r"(make ?up|artist|mobile|freelance|house ?calls?|\bmua\b|\bin[- ]home\b|\bat[- ]home\b|\bon the go\b)",
    re.IGNORECASE,
)


def not_a_storefront(row: dict, name: str) -> bool:
    return bool(RESIDENTIAL_ADDRESS.search(row.get("street_address") or "") or MOBILE_NAME.search(name))


# National chains are less of a community anchor than a local business people
# know by name. Heuristic (labelled as such on the site): a store number, or a
# well-known chain name, lowers the evidence weight to 0.6.
CHAIN_NAME = re.compile(
    r"(#\s?\d{2,}|\b\d{4,}\b|\b(mcdonald|subway|starbucks|jack in the box|burger king|taco bell|kfc|wendy|domino|"
    r"pizza hut|little caesar|el pollo loco|carl'?s jr|panda express|chipotle|popeyes|wingstop|7-?eleven|dunkin|"
    r"ihop|denny|del taco|chick-?fil-?a|in-?n-?out|jollibee|yoshinoya|supercuts|great clips|fantastic sams|"
    r"cost cutters|sport clips|planet fitness|24 hour fitness|la fitness|ralphs|vons|food 4 less|smart (and|&) final)\b)",
    re.IGNORECASE,
)


# Names that suggest alcohol, tobacco or cannabis venues, whatever their licence code.
UNSUITABLE_NAME = re.compile(
    r"\b(liquor|liquors|smoke|smokes|vape|vapor|dispensary|cannabis|hookah|cocktail|cocktails|"
    r"tavern|saloon|brewery|brewing|winery|wine bar|pub|lounge bar|bar)\b",
    re.IGNORECASE,
)
# Phrases containing "bar" that are not alcohol venues.
NOT_ALCOHOL = re.compile(
    r"\b(bar-?b-?q|barbe?cue|juice bar|smoothie bar|salad bar|snack bar|coffee bar|espresso bar|"
    r"acai bar|boba bar|nail bar|brow bar|lash bar|blow ?dry bar|beauty bar|candy bar)\b",
    re.IGNORECASE,
)


def clean_name(row: dict) -> str:
    """Prefer the trading name (DBA) customers know; fall back to the legal name."""
    name = (row.get("dba_name") or row.get("business_name") or "").strip()
    name = re.sub(r"\s+", " ", name)
    # Licence data is upper case; title-case it for people, keep short words natural.
    titled = name.title()
    titled = re.sub(r"\b(Llc|Inc|Corp|Co)\b\.?", lambda m: m.group(1).upper(), titled)
    titled = re.sub(r"'S\b", "'s", titled)
    return titled


def clean_address(text: str) -> str:
    titled = re.sub(r"\s+", " ", (text or "").strip()).title()
    return re.sub(r"(\d)(St|Nd|Rd|Th)\b", lambda m: m.group(1) + m.group(2).lower(), titled)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--county", default="06037")
    args = parser.parse_args()

    # A venue belongs to a zone only if it sits inside one of the zone's actual
    # high-need census tracts. (Zone outlines are convex hulls, which also cover
    # ordinary tracts in between; the first eval run caught this.)
    tracts_fc = json.loads((ROOT / "public" / "data" / "need" / args.county / "zone_tracts.geojson").read_text(encoding="utf-8"))
    zones = [(f["properties"]["zoneId"], prep(shape(f["geometry"])), shape(f["geometry"])) for f in tracts_fc["features"]]
    tree = STRtree([z[2] for z in zones])

    rows = json.loads((ROOT / "data" / "raw" / "lacity" / "venues.json").read_text(encoding="utf-8"))
    today = date(2026, 10, 17)
    venues = []
    seen: set[tuple[str, float, float]] = set()
    skipped_people = 0
    skipped_non_storefront = 0

    for r in rows:
        cat = CATEGORIES.get(r.get("naics", ""))
        loc = r.get("location_1") or {}
        try:
            lat, lon = float(loc.get("latitude") or 0), float(loc.get("longitude") or 0)
        except ValueError:
            continue
        if not cat or not lat or not lon:
            continue
        pt = Point(lon, lat)
        zone_id = None
        for idx in tree.query(pt):
            zid, prepared, _ = zones[int(idx)]
            if prepared.contains(pt):
                zone_id = zid
                break
        if zone_id is None:
            continue

        if looks_like_person(r):
            skipped_people += 1
            continue
        name = clean_name(r)
        if not name:
            continue
        if not_a_storefront(r, name):
            skipped_non_storefront += 1
            continue
        key = (name.lower(), round(lat, 4), round(lon, 4))
        if key in seen:  # same business licensed twice at one spot
            continue
        seen.add(key)

        label, evidence, suitable = cat
        chain = bool(CHAIN_NAME.search(name))
        if chain and suitable:
            evidence = min(evidence, 0.6)
        reason = None
        if not suitable:
            reason = f"{label} (licence type)"
        elif UNSUITABLE_NAME.search(NOT_ALCOHOL.sub(" ", name)) and not re.search(r"\bbarber", name, re.IGNORECASE):
            suitable, reason = False, "Name suggests alcohol, tobacco or cannabis"

        start = r.get("location_start_date", "")[:10]
        years = None
        if start:
            try:
                y, m, d = (int(x) for x in start.split("-"))
                years = round((today - date(y, m, d)).days / 365.25, 1)
            except ValueError:
                years = None

        venues.append({
            "id": f"la-{r.get('location_account', '')}",
            "name": name,
            "category": label,
            "naics": r.get("naics"),
            "evidence": evidence,
            "chain": chain,
            "suitable": suitable,
            "unsuitableReason": reason,
            "address": clean_address(r.get("street_address") or ""),
            "city": (r.get("city") or "Los Angeles").strip().title(),
            "insideCityOfLA": r.get("council_district") not in (None, "", "0"),
            "zip": (r.get("zip_code") or "")[:5],
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "zoneId": zone_id,
            "since": start or None,
            "yearsInBusiness": years,
        })

    out = ROOT / "data" / "derived" / args.county
    out.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": "City of Los Angeles Office of Finance, Listing of Active Businesses (data.lacity.org 6rrh-rzua), CC0 1.0",
        "coverage": "Businesses registered with the City of Los Angeles. This covers the city fully and some businesses in neighbouring cities; most other cities in the county are not included.",
        "excludedSoleTraders": skipped_people,
        "excludedNonStorefront": skipped_non_storefront,
        "builtFor": args.county,
        "venues": venues,
    }
    (out / "venues.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    from collections import Counter
    print(f"venues in zones: {len(venues)} (suitable {sum(v['suitable'] for v in venues)}, unsuitable {sum(not v['suitable'] for v in venues)})")
    print(Counter(v["category"] for v in venues).most_common())
    print(f"chains (evidence lowered to 0.6): {sum(1 for v in venues if v['chain'])}")
    print(f"skipped as likely private individuals: {skipped_people}")
    print(f"skipped as not a shopfront (apartment address or mobile service): {skipped_non_storefront}")
    print(f"zones with at least one venue: {len({v['zoneId'] for v in venues})}")


if __name__ == "__main__":
    main()
