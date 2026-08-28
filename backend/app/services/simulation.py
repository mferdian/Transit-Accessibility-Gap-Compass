from typing import Any, Dict, List, Tuple

import geopandas as gpd
from shapely.geometry import Point

from app.services.local_geojson import load_demografi_gdf
from app.services.mapid import fetch_mapid_layer, safe_float


PROJECTED_CRS = "EPSG:3857"


def feature_collection_to_gdf(collection: Dict[str, Any]) -> gpd.GeoDataFrame:
    features = collection.get("features") or []
    if not features:
        return gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")

    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)
    return gdf


def simulate_intervention(lat: float, lon: float, service_radius: int = 400) -> Dict[str, Any]:
    gap_layer = fetch_mapid_layer("area_gap")
    gap_gdf = feature_collection_to_gdf(gap_layer)
    demografi_gdf = load_optional_demografi_gdf()

    if gap_gdf.empty:
        return {
            "lat": lat,
            "lon": lon,
            "radius_layanan": service_radius,
            "area_gap_terdekat": None,
            "jumlah_area_terdampak": 0,
            "estimasi_penurunan_gap_score": 0.0,
            "estimasi_penduduk_baru": 0,
            "perubahan_ska": {},
        }

    projected_gaps = gap_gdf.to_crs(PROJECTED_CRS)
    point_gdf = gpd.GeoDataFrame(geometry=[Point(lon, lat)], crs="EPSG:4326").to_crs(PROJECTED_CRS)
    clicked_point = point_gdf.geometry.iloc[0]
    service_buffer = clicked_point.buffer(service_radius)

    projected_gaps = projected_gaps.copy()
    projected_gaps["distance_m"] = projected_gaps.geometry.distance(clicked_point)
    nearest_idx = projected_gaps["distance_m"].idxmin()
    nearest = projected_gaps.loc[nearest_idx]

    affected = projected_gaps[projected_gaps.geometry.intersects(service_buffer)].copy()
    if affected.empty:
        affected = projected_gaps.nsmallest(1, "distance_m").copy()

    perubahan_ska: Dict[str, float] = {}
    total_population = 0
    total_reduction = 0.0

    for _, row in affected.iterrows():
        gap_score = float(row.get("gap_score") or 0)
        distance_m = float(row.get("distance_m") or 0)
        distance_factor = max(0.2, 1 - min(distance_m, service_radius) / max(service_radius, 1))
        area_m2 = (
            safe_float(row.get("luas_m2_sum"))
            or safe_float(row.get("luas_m2_mean"))
            or float(row.geometry.area)
        )
        reduction = round(min(0.28, max(0.04, gap_score * 0.22 * distance_factor)), 3)
        feature_id = str(row.get("id") or row.get("fid") or row.name)

        perubahan_ska[feature_id] = -reduction
        total_reduction += reduction
        total_population += estimate_population_served_from_demografi(
            lat=lat,
            lon=lon,
            service_radius=service_radius,
            demografi_gdf=demografi_gdf,
            fallback_area_m2=area_m2,
            fallback_gap_score=gap_score,
        )

    nearest_area = (
        safe_float(nearest.get("luas_m2_sum"))
        or safe_float(nearest.get("luas_m2_mean"))
        or float(nearest.geometry.area)
    )

    return {
        "lat": lat,
        "lon": lon,
        "radius_layanan": service_radius,
        "area_gap_terdekat": {
            "id": str(nearest.get("id") or nearest.get("fid") or nearest.name),
            "display_name": str(nearest.get("display_name") or nearest.get("id") or nearest.get("fid") or "Area GAP"),
            "distance_m": round(float(nearest["distance_m"]), 1),
            "gap_score": round(float(nearest.get("gap_score") or 0), 3),
            "luas_m2": round(float(nearest_area), 1),
        },
        "jumlah_area_terdampak": int(len(affected)),
        "estimasi_penurunan_gap_score": round(total_reduction / max(len(affected), 1), 3),
        "estimasi_penduduk_baru": int(total_population),
        "perubahan_ska": perubahan_ska,
    }


def rank_recommendation_points() -> Dict[str, Any]:
    point_layer = fetch_mapid_layer("titik_rekomendasi")
    gap_layer = fetch_mapid_layer("area_gap")
    point_gdf = feature_collection_to_gdf(point_layer)
    gap_gdf = feature_collection_to_gdf(gap_layer)

    if point_gdf.empty:
        point_layer["features"] = []
        return point_layer

    if gap_gdf.empty:
        return rank_points_without_gaps(point_layer)

    ranked_features = score_point_features(point_layer, point_gdf, gap_gdf)
    ranked_features.sort(key=lambda feature: feature["properties"].get("priority_score", 0), reverse=True)

    for rank, feature in enumerate(ranked_features, start=1):
        feature["properties"]["rank"] = rank

    point_layer["features"] = ranked_features
    return point_layer


def rank_points_without_gaps(point_layer: Dict[str, Any]) -> Dict[str, Any]:
    features = point_layer.get("features") or []
    features.sort(key=lambda feature: safe_float(feature.get("properties", {}).get("CLUSTER_SIZE")) or 0, reverse=True)
    for rank, feature in enumerate(features, start=1):
        feature.setdefault("properties", {})["rank"] = rank
    point_layer["features"] = features
    return point_layer


def score_point_features(
    point_layer: Dict[str, Any],
    point_gdf: gpd.GeoDataFrame,
    gap_gdf: gpd.GeoDataFrame,
) -> List[Dict[str, Any]]:
    projected_points = point_gdf.to_crs(PROJECTED_CRS)
    projected_gaps = gap_gdf.to_crs(PROJECTED_CRS)
    ranked_features = []

    for feature_index, feature in enumerate(point_layer.get("features") or []):
        properties = feature.setdefault("properties", {})
        point_geometry = get_point_geometry(projected_points.geometry.iloc[feature_index])

        if point_geometry is None:
            properties["priority_score"] = 0
            ranked_features.append(feature)
            continue

        nearest_gap, distance_m = nearest_gap_for_point(point_geometry, projected_gaps)
        cluster_size = safe_float(properties.get("CLUSTER_SIZE")) or 1
        nearest_area = safe_float(nearest_gap.get("luas_m2_sum")) or safe_float(nearest_gap.get("luas_m2_mean")) or nearest_gap.geometry.area
        gap_score = float(nearest_gap.get("gap_score") or 0)
        distance_score = max(0, 1 - min(distance_m, 1500) / 1500)
        area_score = min(float(nearest_area) / 100000, 1)
        cluster_score = min(cluster_size / 50, 1)

        priority_score = (cluster_score * 0.45) + (gap_score * 0.25) + (area_score * 0.2) + (distance_score * 0.1)

        properties["priority_score"] = round(priority_score, 3)
        properties["nearest_gap_id"] = str(nearest_gap.get("id") or nearest_gap.get("fid") or nearest_gap.name)
        properties["nearest_gap_distance_m"] = round(float(distance_m), 1)
        properties["nearest_gap_score"] = round(gap_score, 3)
        properties["nearest_gap_luas_m2"] = round(float(nearest_area), 1)
        properties["jenis_rekomendasi"] = "Halte Baru" if distance_m <= 500 else "Feeder"
        ranked_features.append(feature)

    return ranked_features


def nearest_gap_for_point(point: Point, projected_gaps: gpd.GeoDataFrame) -> Tuple[Any, float]:
    distances = projected_gaps.geometry.distance(point)
    nearest_idx = distances.idxmin()
    return projected_gaps.loc[nearest_idx], float(distances.loc[nearest_idx])


def get_point_geometry(geometry: Any) -> Point | None:
    if geometry.geom_type == "Point":
        return geometry
    if geometry.geom_type == "MultiPoint" and len(geometry.geoms) > 0:
        return geometry.geoms[0]
    return geometry.representative_point() if hasattr(geometry, "representative_point") else None


def estimate_population_served(area_m2: float, gap_score: float, service_radius: int) -> int:
    service_area_m2 = 3.14159 * (service_radius ** 2)
    area_factor = min(service_area_m2 / max(area_m2, 1), 1)
    baseline_density = 12000
    return int((service_area_m2 / 1_000_000) * baseline_density * max(gap_score, 0.25) * area_factor)


def load_optional_demografi_gdf() -> gpd.GeoDataFrame | None:
    try:
        return load_demografi_gdf()
    except (FileNotFoundError, KeyError):
        return None


def estimate_population_served_from_demografi(
    lat: float,
    lon: float,
    service_radius: int,
    demografi_gdf: gpd.GeoDataFrame | None,
    fallback_area_m2: float,
    fallback_gap_score: float,
) -> int:
    if demografi_gdf is None or demografi_gdf.empty:
        return estimate_population_served(fallback_area_m2, fallback_gap_score, service_radius)

    projected_demografi = demografi_gdf.to_crs(PROJECTED_CRS)
    point_gdf = gpd.GeoDataFrame(geometry=[Point(lon, lat)], crs="EPSG:4326").to_crs(PROJECTED_CRS)
    service_buffer = point_gdf.geometry.iloc[0].buffer(service_radius)
    intersecting = projected_demografi[projected_demografi.geometry.intersects(service_buffer)].copy()

    if intersecting.empty:
        return estimate_population_served(fallback_area_m2, fallback_gap_score, service_radius)

    total_population = 0.0
    for _, row in intersecting.iterrows():
        population = safe_float(row.get("jumlah_penduduk")) or safe_float(row.get("JUMLAH PENDUDUK 2024"))
        density = safe_float(row.get("kepadatan")) or safe_float(row.get("KEPADATAN PENDUDUK 2024"))
        intersection_area = row.geometry.intersection(service_buffer).area

        if population is not None and row.geometry.area > 0:
            total_population += population * (intersection_area / row.geometry.area)
        elif density is not None:
            total_population += density * (intersection_area / 1_000_000)

    if total_population <= 0:
        return estimate_population_served(fallback_area_m2, fallback_gap_score, service_radius)

    return int(total_population)
