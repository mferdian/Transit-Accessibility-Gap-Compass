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
    has_bus_stop_marker: bool = False
    route_information_evidence: Optional[str] = None
    roof_damage: bool = False
    board_legible: bool = True
    ramp_blocked: bool = False
    guiding_block_broken: bool = False
    confidence_score: float = 0.0
    bounding_boxes: Optional[Dict[str, List[float]]] = None


class AspectScore(BaseModel):
    key: str
    label: str
    score: float
    max_score: float
    note: Optional[str] = None


class HalteConditionDetail(BaseModel):
    status: str
    score: float
    features: VisionFeatureDetection
    aspects: List[AspectScore] = []
    ai_notes: str


class VisionImageInput(BaseModel):
    image_base64: str
    image_mime_type: Optional[str] = "image/jpeg"


class VisionAssessRequest(BaseModel):
    halte_id: str = "unknown"
    halte_name: Optional[str] = None
    # Single-image fields (backward compatible)
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = "image/jpeg"
    # Multi-image support: analyzed individually, then aggregated.
    images: List[VisionImageInput] = []


class PhotoAssessment(BaseModel):
    """Per-photo detection result (before aggregation)."""
    image_index: int
    features: VisionFeatureDetection
    score: float
    status: str


class VisionAssessmentResponse(BaseModel):
    halte_id: str
    halte_name: Optional[str] = None
    last_update: str
    source: str
    assessment: HalteConditionDetail
    photos: List[PhotoAssessment] = []


# --- Simulation Models ---
class SimulateRequest(BaseModel):
    lat: float
    lon: float
    service_radius: int = 400


class SimulateResponse(BaseModel):
    lat: float
    lon: float
    radius_layanan: int
    area_gap_terdekat: Optional[Dict[str, Any]] = None
    jumlah_area_terdampak: int
    estimasi_penurunan_gap_score: float
    estimasi_penduduk_baru: int
    perubahan_ska: Dict[str, float]
