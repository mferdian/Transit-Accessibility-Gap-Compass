export interface KelurahanProperties {
  id: string;
  nama: string;
  kepadatan: number;
  blind_spot_pct: number;
  jarak_first_mile: number;
  frekuensi: number;
  ska_score?: number;
  kategori_ska?: string;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: any; // Keep generic for now
  properties: KelurahanProperties & Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  layer_key?: string;
  layer_id?: string;
  layer_name?: string;
}

export interface SKAParameters {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

export interface CarbonFootprintDetail {
  co2_reduction_tons_year: number;
  tree_equivalent: number;
  daily_vehicle_trips_reduced: number;
  annual_fuel_liters_saved: number;
}

export interface RecommendationPoint {
  lat: number;
  lon: number;
  rank: number;
  estimasi_penduduk_terlayani: number;
  estimasi_perubahan_ska: number;
  radius_layanan: number;
  jenis_rekomendasi: string;
  nama?: string;
  carbon_footprint?: CarbonFootprintDetail;
}

export interface RecommendationResponse {
  status: string;
  recommendations: RecommendationPoint[];
  geojson_layer: GeoJSONFeatureCollection;
  total_carbon_reduction_tons_year?: number;
}

export type MapidLayerKey = "area_gap" | "titik_rekomendasi" | "area_rekomendasi" | "demografi" | "halte_existing";

export interface MapidLayerInfo {
  key: MapidLayerKey;
  layer_id: string;
  label: string;
  geometry_role: string;
}

export interface SelectedFeatureDetail {
  layerKey: string;
  layerName: string;
  geometryType: string;
  properties: Record<string, any>;
  coordinates?: [number, number];
}

export interface SimulationNearestGap {
  id: string;
  display_name: string;
  distance_m: number;
  gap_score: number;
  luas_m2: number;
}

export interface SimulationResult {
  lat: number;
  lon: number;
  radius_layanan: number;
  area_gap_terdekat: SimulationNearestGap | null;
  jumlah_area_terdampak: number;
  estimasi_penurunan_gap_score: number;
  estimasi_penduduk_baru: number;
  perubahan_ska: Record<string, number>;
  carbon_footprint?: CarbonFootprintDetail;
}

export interface VisionFeatureDetection {
  has_ramp: boolean;
  has_guiding_block: boolean;
  has_shelter: boolean;
  has_bench: boolean;
  has_information_board: boolean;
  has_bus_stop_marker: boolean;
  route_information_evidence?: string | null;
  roof_damage: boolean;
  board_legible: boolean;
  ramp_blocked: boolean;
  guiding_block_broken: boolean;
  confidence_score: number;
  bounding_boxes?: Record<string, number[]> | null;
}

export interface AspectScore {
  key: string;
  label: string;
  score: number;
  max_score: number;
  note?: string | null;
}

export interface HalteConditionDetail {
  status: string;
  score: number;
  features: VisionFeatureDetection;
  aspects: AspectScore[];
  ai_notes: string;
}

export interface PhotoAssessment {
  image_index: number;
  features: VisionFeatureDetection;
  score: number;
  status: string;
}

export interface VisionAssessmentResponse {
  halte_id: string;
  halte_name?: string | null;
  last_update: string;
  source: string;
  assessment: HalteConditionDetail;
  photos?: PhotoAssessment[];
}
