from copy import deepcopy
from typing import Any, Dict, List

import httpx

from app.core.config import settings


LayerRegistryEntry = Dict[str, str]


def get_layer_registry() -> Dict[str, LayerRegistryEntry]:
    return {
        "demografi": {
            "layer_id": settings.GEOMAPID_DEMOGRAPHY_LAYER_ID,
            "label": "Demografi",
            "geometry_role": "context",
        },
        "area_rekomendasi": {
            "layer_id": settings.GEOMAPID_RECOMMENDATION_AREA_LAYER_ID,
            "label": "Area Rekomendasi",
            "geometry_role": "polygon",
        },
        "area_gap": {
            "layer_id": settings.GEOMAPID_GAP_AREA_LAYER_ID,
            "label": "Area Kesenjangan",
            "geometry_role": "polygon",
        },
        "titik_rekomendasi": {
            "layer_id": settings.GEOMAPID_RECOMMENDATION_POINT_LAYER_ID,
            "label": "Titik Rekomendasi",
            "geometry_role": "point",
        },
    }


def list_mapid_layers() -> List[Dict[str, str]]:
    return [
        {"key": key, **entry}
        for key, entry in get_layer_registry().items()
        if entry.get("layer_id")
    ]


def fetch_mapid_layer(layer_key: str) -> Dict[str, Any]:
    registry = get_layer_registry()
    if layer_key not in registry:
        raise KeyError(f"Unknown MAPID layer key: {layer_key}")

    layer_id = registry[layer_key]["layer_id"]
    if not settings.GEOMAPID_API_KEY:
        raise ValueError("GEOMAPID_API_KEY must be set in .env")
    if not settings.GEOMAPID_PROJECT_ID:
        raise ValueError("GEOMAPID_PROJECT_ID must be set in .env")

    response = httpx.get(
        settings.GEOMAPID_API_URL,
        params={
            "api_key": settings.GEOMAPID_API_KEY,
            "layer_id": layer_id,
            "project_id": settings.GEOMAPID_PROJECT_ID,
        },
        timeout=60.0,
    )
    response.raise_for_status()
    return normalize_mapid_layer(layer_key, response.json())


def normalize_mapid_layer(layer_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    registry_entry = get_layer_registry()[layer_key]
    layer_id = payload.get("layer_id") or registry_entry["layer_id"]
    layer_name = payload.get("layer_name") or registry_entry["label"]
    features = payload.get("features") or []

    normalized_features = [
        normalize_mapid_feature(feature, layer_key, layer_id, layer_name)
        for feature in features
        if feature.get("geometry")
    ]

    normalized = deepcopy(payload)
    normalized["type"] = "FeatureCollection"
    normalized["layer_key"] = layer_key
    normalized["layer_id"] = layer_id
    normalized["layer_name"] = layer_name
    normalized["features"] = normalized_features
    return normalized


def normalize_mapid_feature(
    feature: Dict[str, Any],
    layer_key: str,
    layer_id: str,
    layer_name: str,
) -> Dict[str, Any]:
    normalized = deepcopy(feature)
    geometry = normalized.get("geometry") or {}
    properties = normalized.get("properties") or {}

    display_name = (
        properties.get("nama")
        or properties.get("NAMA")
        or properties.get("DESA")
        or properties.get("KECAMATAN")
        or properties.get("id")
        or properties.get("fid")
        or layer_name
    )

    properties["_layer_key"] = layer_key
    properties["_layer_id"] = layer_id
    properties["_layer_name"] = layer_name
    properties["_geometry_type"] = geometry.get("type", "Unknown")
    properties["display_name"] = str(display_name)

    if layer_key == "area_gap":
        properties["gap_score"] = estimate_gap_score(properties)
    elif layer_key == "titik_rekomendasi":
        cluster_size = safe_float(properties.get("CLUSTER_SIZE"))
        properties["priority_score"] = cluster_size if cluster_size is not None else 0

    normalized["properties"] = properties
    return normalized


def estimate_gap_score(properties: Dict[str, Any]) -> float:
    value = (
        safe_float(properties.get("ska_score"))
        or safe_float(properties.get("gap_score"))
        or safe_float(properties.get("luas_m2_mean"))
        or safe_float(properties.get("luas_m2_sum"))
        or 0.0
    )

    if value <= 1:
        return round(max(value, 0.0), 3)
    if value <= 100:
        return round(value / 100, 3)
    return round(min(value / 100000, 1.0), 3)


def safe_float(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
