import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List

import geopandas as gpd


LOCAL_LAYER_FILES = {
    "demografi": "DEMOGRAFI DI KOTA SURABAYA.geojson",
    "halte_existing": "HALTE DI KOTA SURABAYA.geojson",
}


def get_geojson_roots() -> List[Path]:
    app_dir = Path(__file__).resolve().parents[1]
    backend_dir = app_dir.parent
    return [
        backend_dir / "data" / "geojson",
        app_dir / "data" / "geojson",
    ]


def get_local_layer_path(layer_key: str) -> Path:
    if layer_key not in LOCAL_LAYER_FILES:
        raise KeyError(f"Unknown local layer key: {layer_key}")

    filename = LOCAL_LAYER_FILES[layer_key]
    for root in get_geojson_roots():
        candidate = root / filename
        if candidate.exists():
            return candidate

    searched = ", ".join(str(root / filename) for root in get_geojson_roots())
    raise FileNotFoundError(f"Local GeoJSON layer not found. Searched: {searched}")


def list_local_layers() -> List[Dict[str, str]]:
    layers = []
    for key, filename in LOCAL_LAYER_FILES.items():
        path = None
        for root in get_geojson_roots():
            candidate = root / filename
            if candidate.exists():
                path = candidate
                break

        layers.append(
            {
                "key": key,
                "label": "Demografi Lokal" if key == "demografi" else "Halte Existing",
                "filename": filename,
                "available": str(path is not None).lower(),
            }
        )
    return layers


def load_local_layer(layer_key: str) -> Dict[str, Any]:
    path = get_local_layer_path(layer_key)
    payload = json.loads(path.read_text(encoding="utf-8"))
    return normalize_local_layer(layer_key, payload, path.name)


def load_demografi_gdf() -> gpd.GeoDataFrame:
    path = get_local_layer_path("demografi")
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)

    gdf = gdf.rename(
        columns={
            "DESA": "nama",
            "KEPADATAN PENDUDUK 2024": "kepadatan",
            "JUMLAH PENDUDUK 2024": "jumlah_penduduk",
            "ID_DESA": "id",
        }
    )

    for column in ["kepadatan", "jumlah_penduduk"]:
        if column in gdf.columns:
            gdf[column] = gdf[column].apply(to_float).fillna(0)

    # Temporary accessibility indicators until first-mile/headway data is available.
    if "blind_spot_pct" not in gdf.columns:
        density = gdf["kepadatan"] if "kepadatan" in gdf.columns else None
        if density is not None and density.max() != density.min():
            density_norm = (density - density.min()) / (density.max() - density.min())
            gdf["blind_spot_pct"] = (35 + (density_norm * 45)).round(2)
        else:
            gdf["blind_spot_pct"] = 50.0

    if "jarak_first_mile" not in gdf.columns:
        gdf["jarak_first_mile"] = 700.0

    if "frekuensi" not in gdf.columns:
        gdf["frekuensi"] = 4.0

    if "id" not in gdf.columns:
        gdf["id"] = gdf.index.astype(str)
    if "nama" not in gdf.columns:
        gdf["nama"] = gdf["id"].astype(str)

    return gdf


def normalize_local_layer(layer_key: str, payload: Dict[str, Any], filename: str) -> Dict[str, Any]:
    normalized = deepcopy(payload)
    features = normalized.get("features") or []
    normalized["type"] = "FeatureCollection"
    normalized["layer_key"] = layer_key
    normalized["layer_id"] = f"local:{filename}"
    normalized["layer_name"] = "Demografi Lokal" if layer_key == "demografi" else "Halte Existing"
    normalized["features"] = [
        normalize_local_feature(feature, layer_key, normalized["layer_id"], normalized["layer_name"])
        for feature in features
        if feature.get("geometry")
    ]
    return normalized


def normalize_local_feature(
    feature: Dict[str, Any],
    layer_key: str,
    layer_id: str,
    layer_name: str,
) -> Dict[str, Any]:
    normalized = deepcopy(feature)
    geometry = normalized.get("geometry") or {}
    properties = normalized.get("properties") or {}

    display_name = (
        properties.get("NAMA")
        or properties.get("nama")
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

    if layer_key == "demografi":
        properties["nama"] = properties.get("DESA") or properties.get("nama") or display_name
        properties["kepadatan"] = to_float(properties.get("KEPADATAN PENDUDUK 2024")) or 0
        properties["jumlah_penduduk"] = to_float(properties.get("JUMLAH PENDUDUK 2024")) or 0
    elif layer_key == "halte_existing":
        properties["nama_halte"] = properties.get("NAMA") or display_name
        properties["status_operasional"] = properties.get("STATUS") or "-"

    normalized["properties"] = properties
    return normalized


def to_float(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        if isinstance(value, str):
            value = value.replace(",", ".")
        return float(value)
    except (TypeError, ValueError):
        return None
