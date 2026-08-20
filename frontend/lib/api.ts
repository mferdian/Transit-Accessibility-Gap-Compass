import { GeoJSONFeatureCollection, SKAParameters } from "./types";

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
