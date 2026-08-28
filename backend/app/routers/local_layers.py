from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from app.services.local_geojson import list_local_layers, load_local_layer

router = APIRouter()


@router.get("/local-layers", response_model=List[Dict[str, str]], tags=["Local GeoJSON"])
def get_available_local_layers():
    return list_local_layers()


@router.get("/local-layers/{layer_key}", response_model=Dict[str, Any], tags=["Local GeoJSON"])
def get_local_layer(layer_key: str):
    try:
        return load_local_layer(layer_key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/halte-existing", response_model=Dict[str, Any], tags=["Local GeoJSON"])
def get_halte_existing():
    return load_local_layer("halte_existing")


@router.get("/demographics", response_model=Dict[str, Any], tags=["Local GeoJSON"])
def get_demographics():
    return load_local_layer("demografi")
