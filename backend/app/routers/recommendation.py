from fastapi import APIRouter, Depends, Query
from app.models.schemas import RecommendationResponse, SKAParameters
from app.services.ska import calculate_ska
from app.services.recommendation import get_recommendations
from app.providers.dataset_provider import get_dataset_provider
from app.utils.geo_helpers import gdf_to_geojson_collection
from app.providers.base import BaseDatasetProvider

router = APIRouter()

@router.get("/recommendations", response_model=RecommendationResponse, tags=["Recommendations"])
def get_halte_recommendations(
    w1: float = Query(0.3, description="Weight for kepadatan (Density)"),
    w2: float = Query(0.3, description="Weight for blind spot percentage"),
    w3: float = Query(0.25, description="Weight for jarak first mile (Distance)"),
    w4: float = Query(0.15, description="Weight for frekuensi layanan (Frequency)"),
    threshold_ska: float = Query(0.5, description="Minimum SKA score to be considered for recommendation"),
    service_radius: int = Query(400, description="Service radius in meters for the proposed halte")
):
    """
    Returns recommendations for new halte locations based on current SKA calculations.
    """
    # 1. Get the provider and base data
    provider: BaseDatasetProvider = get_dataset_provider()
    gdf = provider.load_kelurahan_geodataframe()
    
    # 2. Calculate SKA
    params = SKAParameters(
        weight_kepadatan=w1,
        weight_blind_spot=w2,
        weight_jarak=w3,
        weight_frekuensi=w4
    )
    result_gdf = calculate_ska(gdf, params)
    
    # 3. Get recommendations
    recommendations = get_recommendations(result_gdf, threshold_ska=threshold_ska, service_radius_m=service_radius)
    
    # 4. Generate the response
    # We also return the GeoJSON layer so the frontend has the full map context if needed
    geojson_layer = gdf_to_geojson_collection(result_gdf)

    total_carbon = round(
        sum(
            r.carbon_footprint.co2_reduction_tons_year
            for r in recommendations
            if r.carbon_footprint
        ),
        1
    )
    
    return RecommendationResponse(
        status="success",
        recommendations=recommendations,
        geojson_layer=geojson_layer,
        total_carbon_reduction_tons_year=total_carbon
    )
