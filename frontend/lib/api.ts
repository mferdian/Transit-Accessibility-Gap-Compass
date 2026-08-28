import {
  GeoJSONFeatureCollection,
  MapidLayerInfo,
  MapidLayerKey,
  SimulationResult,
  SKAParameters
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchGapMap(params?: SKAParameters): Promise<GeoJSONFeatureCollection> {
  const url = new URL(`${API_BASE_URL}/api/gap-map`);
  if (params) {
    url.searchParams.append("w1", params.w1.toString());
    url.searchParams.append("w2", params.w2.toString());
    url.searchParams.append("w3", params.w3.toString());
    url.searchParams.append("w4", params.w4.toString());
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json"
    },
    // Adding no-store to always fetch fresh data during simulation/filtering
    cache: 'no-store' 
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching gap map: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchRecommendations(
  params?: SKAParameters,
  threshold_ska: number = 0.5,
  service_radius: number = 400
): Promise<any> { // Will be typed as RecommendationResponse
  const url = new URL(`${API_BASE_URL}/api/recommendations`);
  if (params) {
    url.searchParams.append("w1", params.w1.toString());
    url.searchParams.append("w2", params.w2.toString());
    url.searchParams.append("w3", params.w3.toString());
    url.searchParams.append("w4", params.w4.toString());
  }
  url.searchParams.append("threshold_ska", threshold_ska.toString());
  url.searchParams.append("service_radius", service_radius.toString());
  
  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json"
    },
    cache: 'no-store' 
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching recommendations: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchMapidLayers(): Promise<MapidLayerInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/mapid/layers`, {
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Error fetching MAPID layers: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchMapidLayer(layerKey: MapidLayerKey): Promise<GeoJSONFeatureCollection> {
  const response = await fetch(`${API_BASE_URL}/api/mapid/layers/${layerKey}`, {
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Error fetching MAPID layer ${layerKey}: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchLocalLayer(layerKey: "demografi" | "halte_existing"): Promise<GeoJSONFeatureCollection> {
  const response = await fetch(`${API_BASE_URL}/api/local-layers/${layerKey}`, {
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Error fetching local layer ${layerKey}: ${response.statusText}`);
  }

  return response.json();
}

export async function runSimulation(lat: number, lon: number, serviceRadius: number = 400): Promise<SimulationResult> {
  const response = await fetch(`${API_BASE_URL}/api/simulate`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      lat,
      lon,
      service_radius: serviceRadius
    })
  });

  if (!response.ok) {
    throw new Error(`Error running simulation: ${response.statusText}`);
  }

  return response.json();
}
