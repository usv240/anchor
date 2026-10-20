"""Build Anchor's need layer for one county.

Reads CDC PLACES tract estimates and Census tract shapes, scores every tract,
merges the highest-need tracts into zones, and writes small public files the
web app and the agent use.

Method (see anchor/TECHNICAL_DESIGN.md, section 3):
    untreated_t = adults_t * bphigh_t * (1 - bpmed_t)
    need_t      = 0.5 * pct_rank(untreated_t) + 0.5 * pct_rank(bphigh_t)
    zones       = tracts with need_t in the top share, grouped when within
                  GROUP_DISTANCE_M, split above MAX_ZONE_KM2, outlined as a
                  convex hull with at most MAX_VERTICES points.

Usage:
    uv run python pipeline/build_need.py --county 06037
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely import wkt as shapely_wkt
from shapely.geometry import MultiPolygon, Polygon, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data" / "need"

PROJECTED_CRS = "EPSG:3310"  # California Albers, metres, equal area
GROUP_DISTANCE_M = 800  # high-need tracts closer than this join one zone
MAX_ZONE_KM2 = 15.0
MAX_VERTICES = 60
MIN_ADULTS = 50  # PLACES suppresses tracts below this anyway


def load_tracts(county: str) -> gpd.GeoDataFrame:
    places = pd.DataFrame(json.loads((RAW / f"places_{county}.json").read_text()))
    for col in ["totalpop18plus", "bphigh_crudeprev", "bpmed_crudeprev"]:
        places[col] = pd.to_numeric(places[col], errors="coerce")
    places = places.dropna(subset=["totalpop18plus", "bphigh_crudeprev", "bpmed_crudeprev"])
    places = places[places["totalpop18plus"] >= MIN_ADULTS]

    shapes = gpd.read_file(RAW / "census" / "cb_2023_06_tract_500k.shp")
    shapes = shapes[shapes["GEOID"].str.startswith(county)][["GEOID", "geometry"]]

    merged = shapes.merge(places, left_on="GEOID", right_on="tractfips", how="inner")
    unmatched = len(places) - len(merged)
    print(f"tracts with data: {len(places)}, matched to shapes: {len(merged)}, unmatched: {unmatched}")
    return gpd.GeoDataFrame(merged, geometry="geometry", crs=shapes.crs).to_crs("EPSG:4326")


def score(tracts: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    t = tracts.copy()
    t["adults"] = t["totalpop18plus"].astype(int)
    t["hbp_rate"] = t["bphigh_crudeprev"] / 100.0
    t["med_rate"] = t["bpmed_crudeprev"] / 100.0
    t["untreated"] = t["adults"] * t["hbp_rate"] * (1.0 - t["med_rate"])
    t["need"] = 0.5 * t["untreated"].rank(pct=True) + 0.5 * t["hbp_rate"].rank(pct=True)
    t["need_pct"] = t["need"].rank(pct=True)
    return t


def hull_km2(members: gpd.GeoDataFrame) -> float:
    return unary_union(members.geometry.tolist()).convex_hull.area / 1e6


def split_large(members: gpd.GeoDataFrame) -> list[gpd.GeoDataFrame]:
    """Recursively split a group of tracts along its longer axis (median of tract
    points) until each group's outline is at most MAX_ZONE_KM2. Deterministic.
    A single tract is never split, so a large rural tract stays one zone."""
    if len(members) <= 1 or hull_km2(members) <= MAX_ZONE_KM2:
        return [members]
    pts = members.geometry.representative_point()
    axis_x = (pts.x.max() - pts.x.min()) >= (pts.y.max() - pts.y.min())
    coord = pts.x if axis_x else pts.y
    cut = coord.median()
    left, right = members[coord <= cut], members[coord > cut]
    if left.empty or right.empty:
        return [members]
    return split_large(left) + split_large(right)


def outline(members_wgs84: gpd.GeoDataFrame) -> Polygon:
    """The zone outline sent to Qloo: the convex hull of the member tracts,
    simplified to at most MAX_VERTICES points. A hull keeps nearby, non-touching
    high-need tracts in one query and stays short enough for a GET URL."""
    hull = unary_union(members_wgs84.geometry.tolist()).convex_hull
    if not isinstance(hull, Polygon):  # degenerate case, should not happen for real tracts
        hull = hull.buffer(0.001)
    tol = 0.0002
    simple = hull
    for _ in range(40):
        if len(simple.exterior.coords) <= MAX_VERTICES:
            break
        simple = hull.simplify(tol, preserve_topology=True)
        tol *= 1.5
    return simple


def round_wkt(poly: Polygon) -> str:
    coords = ", ".join(f"{x:.5f} {y:.5f}" for x, y in poly.exterior.coords)
    return f"POLYGON(({coords}))"


def build_zones(scored: gpd.GeoDataFrame, top_share: float) -> list[dict]:
    """Group high-need tracts that lie within GROUP_DISTANCE_M of each other,
    split groups larger than MAX_ZONE_KM2, and describe each zone."""
    cutoff = 1.0 - top_share
    high = scored[scored["need_pct"] > cutoff].to_crs(PROJECTED_CRS)
    blob = unary_union(high.geometry.buffer(GROUP_DISTANCE_M / 2).tolist())
    pieces = list(blob.geoms) if isinstance(blob, MultiPolygon) else [blob]
    rep = high.geometry.representative_point()

    zones = []
    for piece in pieces:
        group = high[rep.within(piece)]
        for members in split_large(group):
            members_wgs84 = members.to_crs("EPSG:4326")
            simple = outline(members_wgs84)
            w = members["adults"]
            zones.append({
                "need": round(float((members["need"] * w).sum() / w.sum()), 4),
                "estUntreatedAdults": int(round(members["untreated"].sum())),
                "adults": int(w.sum()),
                "tracts": sorted(members["GEOID"].tolist()),
                "centroid": [round(simple.centroid.x, 5), round(simple.centroid.y, 5)],
                "areaKm2": round(hull_km2(members), 2),
                "wkt": round_wkt(simple),
                "geometry": mapping(simple),
            })

    zones.sort(key=lambda z: z["estUntreatedAdults"], reverse=True)
    for i, z in enumerate(zones, 1):
        z["zoneId"] = f"z{scored['GEOID'].iloc[0][:5]}-{i:03d}"
    return zones


def write_outputs(county: str, scored: gpd.GeoDataFrame, zones: list[dict], top_share: float) -> None:
    out = OUT / county
    out.mkdir(parents=True, exist_ok=True)

    tracts_out = scored[["GEOID", "adults", "bphigh_crudeprev", "bpmed_crudeprev", "untreated", "need", "need_pct", "geometry"]].copy()
    tracts_out["geometry"] = tracts_out.geometry.simplify(0.0003, preserve_topology=True)
    tracts_out["untreated"] = tracts_out["untreated"].round().astype(int)
    tracts_out["need"] = tracts_out["need"].round(4)
    tracts_out["need_pct"] = tracts_out["need_pct"].round(4)
    tracts_out = tracts_out.rename(columns={"bphigh_crudeprev": "bphigh", "bpmed_crudeprev": "bpmed"})
    tracts_out.to_file(out / "tracts.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)


    write_focus(out, scored, zones)

    # Real neighbourhood shapes of every high-need tract, tagged with its zone, for the app map.
    zone_of = {g: z["zoneId"] for z in zones for g in z["tracts"]}
    zt = scored[scored["GEOID"].isin(zone_of.keys())][["GEOID", "need_pct", "geometry"]].copy()
    zt["zoneId"] = zt["GEOID"].map(zone_of)
    zt["geometry"] = zt.geometry.simplify(0.00025, preserve_topology=True)
    zt["need_pct"] = zt["need_pct"].round(3)
    zt[["zoneId", "need_pct", "geometry"]].to_file(out / "zone_tracts.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)

    zone_fc = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "geometry": z["geometry"], "properties": {k: v for k, v in z.items() if k not in ("geometry",)}}
            for z in zones
        ],
    }
    (out / "zones.geojson").write_text(json.dumps(zone_fc, separators=(",", ":")))

    summary = {
        "countyFips": county,
        "countyName": scored["countyname"].iloc[0] + " County",
        "source": "CDC PLACES 2025 release (data.cdc.gov yjkw-uj5s), US Census cartographic boundary tracts 2023",
        "method": "untreated = adults x bphigh x (1 - bpmed); need = 0.5 pct_rank(untreated) + 0.5 pct_rank(bphigh)",
        "topShare": top_share,
        "tracts": int(len(scored)),
        "adults": int(scored["adults"].sum()),
        "estUntreatedAdults": int(round(scored["untreated"].sum())),
        "zones": len(zones),
        "zoneTracts": int(sum(len(z["tracts"]) for z in zones)),
        "zoneEstUntreatedAdults": int(sum(z["estUntreatedAdults"] for z in zones)),
        "maxZoneWktBytes": max(len(z["wkt"]) for z in zones) if zones else 0,
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


FOCUS_TOP_ZONES = 10


def write_focus(out: Path, scored: gpd.GeoDataFrame, zones: list[dict]) -> None:
    """A small, map-ready extract for the landing page: the area around the
    FOCUS_TOP_ZONES zones with the most untreated adults, with real tract shapes.
    Maps should show where people are, not where land is, so we zoom to the
    dense core instead of drawing the whole county."""
    top = zones[:FOCUS_TOP_ZONES]
    xs = [z["centroid"][0] for z in top]
    ys = [z["centroid"][1] for z in top]
    pad_x = (max(xs) - min(xs)) * 0.18 + 0.01
    pad_y = (max(ys) - min(ys)) * 0.18 + 0.01
    bbox = [min(xs) - pad_x, min(ys) - pad_y, max(xs) + pad_x, max(ys) + pad_y]

    # Widen or heighten the frame to a 5:4 landscape shape (in ground distance),
    # so the hero map does not push its caption below the fold.
    k = math.cos(math.radians((bbox[1] + bbox[3]) / 2))
    w, h = (bbox[2] - bbox[0]) * k, bbox[3] - bbox[1]
    target = 1.25
    if w / h < target:
        extra = (h * target - w) / k / 2
        bbox[0] -= extra
        bbox[2] += extra
    else:
        extra = (w / target - h) / 2
        bbox[1] -= extra
        bbox[3] += extra
    frame =Polygon([(bbox[0], bbox[1]), (bbox[2], bbox[1]), (bbox[2], bbox[3]), (bbox[0], bbox[3])])

    inside = scored[scored.geometry.intersects(frame)].copy()
    inside["geometry"] = inside.geometry.intersection(frame).simplify(0.0002, preserve_topology=True)
    cutoff = scored["need_pct"].quantile(0.8)

    rank_of = {}
    for i, z in enumerate(zones, 1):
        for g in z["tracts"]:
            rank_of[g] = i

    # Everything not high-need is drawn as one merged background shape (land).
    land = unary_union(inside.geometry.buffer(0.0002).tolist()).simplify(0.0006, preserve_topology=True)

    features = []
    for _, row in inside[inside["need_pct"] > cutoff].iterrows():
        geom = row.geometry
        if geom.is_empty:
            continue
        features.append({
            "type": "Feature",
            "geometry": json.loads(json.dumps(mapping(geom))),
            "properties": {
                "high": bool(row["need_pct"] > cutoff),
                "needPct": round(float(row["need_pct"]), 3),
                "zoneRank": rank_of.get(row["GEOID"]),
            },
        })

    def rounded(obj):
        if isinstance(obj, float):
            return round(obj, 4)
        if isinstance(obj, (list, tuple)):
            return [rounded(o) for o in obj]
        if isinstance(obj, dict):
            return {k: rounded(v) for k, v in obj.items()}
        return obj

    focus = {
        "bbox": [round(b, 4) for b in bbox],
        "land": rounded(json.loads(json.dumps(mapping(land)))),
        "pins": [{"rank": i + 1, "zoneId": z["zoneId"], "centroid": z["centroid"], "estUntreatedAdults": z["estUntreatedAdults"]} for i, z in enumerate(top)],
        "tracts": {"type": "FeatureCollection", "features": rounded(features)},
    }
    (out / "focus.json").write_text(json.dumps(focus, separators=(",", ":")))
    print(f"focus: {len(inside)} tracts in view, {len(features)} high-need drawn individually")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--county", default="06037")
    parser.add_argument("--top-share", type=float, default=0.2)
    args = parser.parse_args()

    tracts = load_tracts(args.county)
    scored = score(tracts)
    zones = build_zones(scored, args.top_share)
    write_outputs(args.county, scored, zones, args.top_share)

    # Sanity check: every zone WKT parses and is valid.
    for z in zones:
        assert shapely_wkt.loads(z["wkt"]).is_valid, z["zoneId"]
    sizes = sorted(z["areaKm2"] for z in zones)
    print(f"zone area km2: min {sizes[0]}, median {sizes[len(sizes)//2]}, max {sizes[-1]}")
    print(f"zones with 1 tract: {sum(1 for z in zones if len(z['tracts']) == 1)}")


if __name__ == "__main__":
    main()
