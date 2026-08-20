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
  properties: KelurahanProperties;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface SKAParameters {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}
