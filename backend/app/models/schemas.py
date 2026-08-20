from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# --- GeoJSON Base Models ---
class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


# --- SKA Models ---
class KelurahanProperties(BaseModel):
    id: str
    nama: str
    kepadatan: float
    blind_spot_pct: float
    jarak_first_mile: float
    frekuensi: float
    ska_score: Optional[float] = None
    kategori_ska: Optional[str] = None


class SKAParameters(BaseModel):
    weight_kepadatan: float = 0.3
    weight_blind_spot: float = 0.3
    weight_jarak: float = 0.25
    weight_frekuensi: float = 0.15


# --- Recommendation Models ---
class RecommendationRequest(BaseModel):
    threshold_ska: float = 0.6
    service_radius: int = 400


class HalteRecommendationPoint(BaseModel):
    lat: float
    lon: float
    rank: int
    estimasi_penduduk_terlayani: int
    estimasi_perubahan_ska: float
    radius_layanan: int
    jenis_rekomendasi: str


class RecommendationResponse(BaseModel):
    status: str
    recommendations: List[HalteRecommendationPoint]
    geojson_layer: GeoJSONFeatureCollection


# --- Vision Models ---
class VisionFeatureDetection(BaseModel):
    has_ramp: bool = False
    has_guiding_block: bool = False
    has_shelter: bool = False
    has_bench: bool = False
    has_information_board: bool = False
    roof_damage: bool = False
    confidence_score: float = 0.0
    bounding_boxes: Optional[Dict[str, List[float]]] = None


class HalteConditionDetail(BaseModel):
    status: str
    score: int
    features: VisionFeatureDetection
    ai_notes: str


class VisionAssessmentResponse(BaseModel):
    halte_id: str
    assessment: HalteConditionDetail


# --- Simulation Models ---
class SimulateRequest(BaseModel):
    lat: float
    lon: float


class SimulateResponse(BaseModel):
    estimasi_penduduk_baru: int
    perubahan_ska: Dict[str, float]
