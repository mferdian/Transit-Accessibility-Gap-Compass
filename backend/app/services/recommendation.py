import geopandas as gpd
from typing import List
import pandas as pd
from app.models.schemas import HalteRecommendationPoint

def get_recommendations(gdf_with_ska: gpd.GeoDataFrame, threshold_ska: float = 0.5, service_radius_m: int = 400) -> List[HalteRecommendationPoint]:
    """
    Generate recommendations for new halte locations based on regions with high SKA scores.
    """
    if gdf_with_ska.empty or 'ska_score' not in gdf_with_ska.columns:
        return []
    
    # 1. Filter kelurahan with high SKA
    kritis_gdf = gdf_with_ska[gdf_with_ska['ska_score'] >= threshold_ska].copy()
    
    if kritis_gdf.empty:
        return []
    
    # 2. Use centroids of these critical polygons as candidate halte locations
    # Ensure CRS is projected for accurate centroid calculation (e.g., EPSG:3857 for meters)
    original_crs = kritis_gdf.crs
    if original_crs and original_crs.is_geographic:
        projected_gdf = kritis_gdf.to_crs(epsg=3857)
    else:
        projected_gdf = kritis_gdf
        
    centroids_projected = projected_gdf.geometry.centroid
    centroids_geographic = centroids_projected.to_crs(original_crs)
    
    kritis_gdf['kandidat_lon'] = centroids_geographic.x
    kandidat_lat = centroids_geographic.y
    kritis_gdf['kandidat_lat'] = kandidat_lat
    
    # 3. Estimate population served
    # Very simple estimation: density * area of service circle
    import math
    service_area_km2 = math.pi * ((service_radius_m / 1000) ** 2)
    
    recommendations = []
    
    for idx, row in kritis_gdf.iterrows():
        # Fallbacks if columns are missing or not numeric
        kepadatan = float(row.get('kepadatan', 0))
        estimasi_penduduk = int(kepadatan * service_area_km2)
        
        # Simple heuristic for estimasi perubahan SKA
        estimasi_perubahan = round(float(row['ska_score']) * 0.15, 3) 
        
        jenis_rek = "Prioritas Tinggi" if row['ska_score'] >= 0.75 else "Prioritas Menengah"
        
        recommendations.append({
            'lat': row['kandidat_lat'],
            'lon': row['kandidat_lon'],
            'estimasi_penduduk_terlayani': estimasi_penduduk,
            'estimasi_perubahan_ska': estimasi_perubahan,
            'radius_layanan': service_radius_m,
            'jenis_rekomendasi': jenis_rek,
            'nama': row.get('nama', 'Unknown')
        })
        
    # 4. Rank by population served
    recommendations.sort(key=lambda x: x['estimasi_penduduk_terlayani'], reverse=True)
    
    final_recs = []
    for rank, rec in enumerate(recommendations, start=1):
        final_recs.append(
            HalteRecommendationPoint(
                lat=rec['lat'],
                lon=rec['lon'],
                rank=rank,
                estimasi_penduduk_terlayani=rec['estimasi_penduduk_terlayani'],
                estimasi_perubahan_ska=rec['estimasi_perubahan_ska'],
                radius_layanan=rec['radius_layanan'],
                jenis_rekomendasi=rec['jenis_rekomendasi']
            )
        )
        
    return final_recs
