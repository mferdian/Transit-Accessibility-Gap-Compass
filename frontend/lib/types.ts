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

export interface RecommendationPoint {
  lat: number;
  lon: number;
  rank: number;
  estimasi_penduduk_terlayani: number;
  estimasi_perubahan_ska: number;
  radius_layanan: number;
  jenis_rekomendasi: string;
  nama?: string;
}

export interface RecommendationResponse {
  status: string;
  recommendations: RecommendationPoint[];
  geojson_layer: GeoJSONFeatureCollection;
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
}
