from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()


class Location(BaseModel):
    latitude: float = Field(..., example=-6.2088)
    longitude: float = Field(..., example=106.8456)


class TransitGapQuery(BaseModel):
    boundary_geojson: Optional[Dict[str, Any]] = Field(None, description="Optional boundary GeoJSON polygon to analyze")
    resolution_meters: int = Field(500, description="Spatial resolution in meters", example=500)
    include_demographics: bool = Field(True, description="Correlate with population density data")


class GapZone(BaseModel):
    id: str
    name: str
    gap_score: float = Field(..., description="Gap score from 0 (perfect transit) to 1 (no transit)", example=0.75)
    population_affected: int = Field(..., example=12500)
    geometry: Dict[str, Any] = Field(..., description="GeoJSON Polygon of the gap area")
    recommendations: List[str] = Field(..., description="List of proposed improvements")


@router.post("/gap-analysis", response_model=Dict[str, Any], tags=["Transit Gap"])
def run_gap_analysis(payload: TransitGapQuery):
    """
    Run Transit Gap Analysis for a given area.
    Calculates discrepancies between public transit supply and demand.
    """
    # Placeholder implementation
    return {
        "status": "completed",
        "resolution_meters": payload.resolution_meters,
        "summary": {
            "total_area_sqkm": 24.5,
            "average_gap_score": 0.42,
            "high_gap_area_sqkm": 5.2,
            "estimated_underserved_population": 42000
        },
        "message": "Analysis calculated successfully. Real implementation will process GTFS datasets and population census data."
    }


@router.get("/gap-zones", response_model=List[GapZone], tags=["Transit Gap"])
def get_high_gap_zones(
    min_score: float = Query(0.5, description="Filter zones with gap score higher than this value", ge=0.0, le=1.0)
):
    """
    Get identified high transit gap zones (hotspots of poor accessibility).
    """
    # Sample mock data
    mock_zones = [
        {
            "id": "zone-01",
            "name": "Kecamatan Duren Sawit Utara",
            "gap_score": 0.78,
            "population_affected": 18500,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [106.90, -6.22],
                        [106.92, -6.22],
                        [106.92, -6.24],
                        [106.90, -6.24],
                        [106.90, -6.22]
                    ]
                ]
            },
            "recommendations": [
                "Add feeder bus route connecting to LRT Station",
                "Improve pedestrian walkway within 500m of main corridor"
            ]
        },
        {
            "id": "zone-02",
            "name": "Kawasan Industri Pulo Gadung Timur",
            "gap_score": 0.62,
            "population_affected": 24000,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [106.88, -6.18],
                        [106.90, -6.18],
                        [106.90, -6.20],
                        [106.88, -6.20],
                        [106.88, -6.18]
                    ]
                ]
            },
            "recommendations": [
                "Increase microtransit (Angkot) frequency during peak hours (07:00-09:00)",
                "Establish new TransJakarta shelter at Blok J"
            ]
        }
    ]

    filtered_zones = [z for z in mock_zones if z["gap_score"] >= min_score]
    return filtered_zones
