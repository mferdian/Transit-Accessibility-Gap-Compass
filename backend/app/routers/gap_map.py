from fastapi import APIRouter, Depends, Query
from app.models.schemas import GeoJSONFeatureCollection, SKAParameters
from app.services.ska import calculate_ska
from app.providers.dataset_provider import get_dataset_provider
from app.utils.geo_helpers import gdf_to_geojson_collection
from app.providers.base import BaseDatasetProvider

router = APIRouter()

@router.get("/gap-map", response_model=GeoJSONFeatureCollection, tags=["Transit Gap"])
def get_gap_map(
    w1: float = Query(0.3, description="Weight for kepadatan (Density)"),
    w2: float = Query(0.3, description="Weight for blind spot percentage"),
    w3: float = Query(0.25, description="Weight for jarak first mile (Distance)"),
    w4: float = Query(0.15, description="Weight for frekuensi layanan (Frequency)")
):
    """
    Returns the Transit Accessibility Gap Map as a GeoJSON FeatureCollection.
    The SKA score is calculated dynamically based on the provided weights.
    """
    # 1. Get the appropriate provider based on config
    provider: BaseDatasetProvider = get_dataset_provider()
    
    # 2. Load the base data
    gdf = provider.load_kelurahan_geodataframe()
    
    # 3. Calculate SKA
    params = SKAParameters(
        weight_kepadatan=w1,
        weight_blind_spot=w2,
        weight_jarak=w3,
        weight_frekuensi=w4
    )
    result_gdf = calculate_ska(gdf, params)
    
    # 4. Convert to GeoJSON response format
    return gdf_to_geojson_collection(result_gdf)
