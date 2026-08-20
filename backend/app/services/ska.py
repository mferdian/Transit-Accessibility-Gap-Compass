import geopandas as gpd
from typing import Dict, Any
from app.utils.geo_helpers import normalize_series
from app.models.schemas import SKAParameters

def calculate_ska(gdf: gpd.GeoDataFrame, params: SKAParameters = SKAParameters()) -> gpd.GeoDataFrame:
    """
    Calculates the Skor Kesenjangan Aksesibilitas (SKA) for a GeoDataFrame of regions.
    
    Args:
        gdf: GeoDataFrame containing regions with required columns: 
             'kepadatan', 'blind_spot_pct', 'jarak_first_mile', 'frekuensi'
        params: SKAParameters containing weights for each variable.
        
    Returns:
        A copy of the GeoDataFrame with an added 'ska_score' and 'kategori_ska' columns.
    """
    if gdf.empty:
        return gdf
        
    result_gdf = gdf.copy()
    
    # Extract weights
    w1 = params.weight_kepadatan
    w2 = params.weight_blind_spot
    w3 = params.weight_jarak
    w4 = params.weight_frekuensi
    
    # 1. Normalize each variable (min-max scaling to 0-1)
    # Higher density -> higher need for transit -> closer to 1
    kepadatan_norm = normalize_series(result_gdf['kepadatan'])
    
    # Higher blind spot -> higher gap -> closer to 1
    blind_spot_norm = normalize_series(result_gdf['blind_spot_pct'])
    
    # Higher distance -> higher gap -> closer to 1
    jarak_norm = normalize_series(result_gdf['jarak_first_mile'])
    
    # Higher frequency -> better transit (lower gap) -> invert so higher frequency is closer to 0
    frekuensi_norm = normalize_series(result_gdf['frekuensi'], invert=True)
    
    # 2. Calculate composite score
    # Formula: SKA = (w1*kepadatan) + (w2*blind_spot) + (w3*jarak) + (w4*frekuensi_inverted)
    # (Notice we use + for frekuensi because we already inverted it)
    composite = (
        (w1 * kepadatan_norm) + 
        (w2 * blind_spot_norm) + 
        (w3 * jarak_norm) + 
        (w4 * frekuensi_norm)
    )
    
    # 3. Normalize the final score to 0-1
    final_ska = normalize_series(composite)
    result_gdf['ska_score'] = final_ska
    
    # 4. Categorize SKA
    def categorize(score: float) -> str:
        if score >= 0.75:
            return "Sangat Kritis"
        elif score >= 0.5:
            return "Tinggi"
        elif score >= 0.25:
            return "Sedang"
        else:
            return "Rendah"
            
    result_gdf['kategori_ska'] = result_gdf['ska_score'].apply(categorize)
    
    return result_gdf
