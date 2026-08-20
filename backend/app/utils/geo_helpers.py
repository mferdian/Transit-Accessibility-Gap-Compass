import geopandas as gpd
import pandas as pd
import numpy as np
from typing import Dict, Any
from app.models.schemas import GeoJSONFeatureCollection

def normalize_series(series: pd.Series, invert: bool = False) -> pd.Series:
    """
    Normalizes a pandas Series to a 0-1 range using min-max scaling.
    If invert is True, higher original values become closer to 0 (e.g., for frequency where more is better for gap but reduces the gap score).
    """
    min_val = series.min()
    max_val = series.max()
    
    if max_val == min_val:
        return pd.Series(0.0, index=series.index)
        
    normalized = (series - min_val) / (max_val - min_val)
    if invert:
        normalized = 1.0 - normalized
        
    return normalized

def gdf_to_geojson_collection(gdf: gpd.GeoDataFrame) -> GeoJSONFeatureCollection:
    """
    Converts a GeoDataFrame into a Pydantic GeoJSONFeatureCollection model.
    """
    # Fill NA values with None for JSON serialization
    gdf_cleaned = gdf.replace({np.nan: None})
    geojson_dict = gdf_cleaned.__geo_interface__
    
    # Let Pydantic parse and validate it
    return GeoJSONFeatureCollection(**geojson_dict)
