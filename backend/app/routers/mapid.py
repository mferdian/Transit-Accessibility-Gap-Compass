from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from app.services.mapid import fetch_mapid_layer, list_mapid_layers
from app.services.simulation import rank_recommendation_points

router = APIRouter()


@router.get("/mapid/layers", response_model=List[Dict[str, str]], tags=["MAPID"])
def get_available_mapid_layers():
    return list_mapid_layers()


@router.get("/mapid/layers/{layer_key}", response_model=Dict[str, Any], tags=["MAPID"])
def get_mapid_layer(layer_key: str):
    try:
        return fetch_mapid_layer(layer_key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/gap-areas", response_model=Dict[str, Any], tags=["Transit Gap"])
def get_gap_areas():
    return fetch_mapid_layer("area_gap")


@router.get("/recommendation-areas", response_model=Dict[str, Any], tags=["Recommendations"])
def get_recommendation_areas():
    return fetch_mapid_layer("area_rekomendasi")


@router.get("/recommendation-points", response_model=Dict[str, Any], tags=["Recommendations"])
def get_recommendation_points():
    return rank_recommendation_points()
