import os
import json
import geopandas as gpd
from typing import Optional
from app.providers.base import BaseDatasetProvider
from app.core.config import settings
from app.services.local_geojson import load_demografi_gdf

class MockDatasetProvider(BaseDatasetProvider):
    def load_kelurahan_geodataframe(self) -> gpd.GeoDataFrame:
        """Loads mock kelurahan GeoJSON from the mock_data directory."""
        mock_file_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "mock_data",
            "kelurahan_surabaya.geojson"
        )
        if not os.path.exists(mock_file_path):
            raise FileNotFoundError(f"Mock data not found at {mock_file_path}")
        
        # Load directly using geopandas
        gdf = gpd.read_file(mock_file_path)
        return gdf

class ExcelDatasetProvider(BaseDatasetProvider):
    def load_kelurahan_geodataframe(self) -> gpd.GeoDataFrame:
        """
        Loads kelurahan data from Excel and converts it to a GeoDataFrame.
        If geometries are missing, this should implement a fallback or raise an error.
        """
        excel_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            settings.EXCEL_FILE_PATH
        )
        if not os.path.exists(excel_path):
            raise FileNotFoundError(f"Excel data not found at {excel_path}")
        
        import pandas as pd
        df = pd.read_excel(excel_path)
        
        # NOTE: If Excel only contains lat/lon, we would convert it to Point geometries here.
        # If it has WKT, we would convert WKT to geometries.
        # Since we don't have the Excel file yet, this is just a placeholder.
        # TODO: Implement actual Excel parsing based on confirmed column names.
        
        # For now, if we reach here without geometries, we could fallback to mock geometries
        # or just raise NotImplementedError until the structure is confirmed.
        raise NotImplementedError("ExcelDatasetProvider is not fully implemented yet.")

class LocalGeoJSONDatasetProvider(BaseDatasetProvider):
    def load_kelurahan_geodataframe(self) -> gpd.GeoDataFrame:
        """Loads local demografi GeoJSON as kelurahan polygons for SKA calculation."""
        return load_demografi_gdf()

class GeoMapidDatasetProvider(BaseDatasetProvider):
    _cache: Optional[gpd.GeoDataFrame] = None
    _cache_time: Optional[float] = None
    _cache_ttl: float = 300.0  # 5 minutes

    def load_kelurahan_geodataframe(self) -> gpd.GeoDataFrame:
        """Loads kelurahan data directly from GEO MAPID Layer API with caching."""
        import time

        # Return cached data if available and fresh
        if (GeoMapidDatasetProvider._cache is not None 
            and GeoMapidDatasetProvider._cache_time is not None
            and (time.time() - GeoMapidDatasetProvider._cache_time) < GeoMapidDatasetProvider._cache_ttl):
            return GeoMapidDatasetProvider._cache.copy()

        if not settings.GEOMAPID_API_KEY or not settings.GEOMAPID_LAYER_ID:
            raise ValueError("GEOMAPID_API_KEY and GEOMAPID_LAYER_ID must be set in .env")
            
        import httpx
        url = f"{settings.GEOMAPID_API_URL}?api_key={settings.GEOMAPID_API_KEY}&layer_id={settings.GEOMAPID_LAYER_ID}"
        if settings.GEOMAPID_PROJECT_ID:
            url += f"&project_id={settings.GEOMAPID_PROJECT_ID}"
            
        response = httpx.get(url, timeout=60.0)
        response.raise_for_status()
        geojson_data = response.json()
        
        # Convert to GeoDataFrame
        gdf = gpd.GeoDataFrame.from_features(geojson_data["features"])
        
        # Map required properties
        # The mapid layer has 'DESA', 'KEPADATAN PENDUDUK 2024'
        if 'DESA' in gdf.columns:
            gdf['nama'] = gdf['DESA']
        if 'KEPADATAN PENDUDUK 2024' in gdf.columns:
            gdf['kepadatan'] = gdf['KEPADATAN PENDUDUK 2024'].round(1)
            
        # Add mock or estimated values for SKA calculation if they don't exist
        if 'blind_spot_pct' not in gdf.columns:
            import numpy as np
            # Random estimation for simulation if not in layer
            np.random.seed(42)  # Fixed seed for consistent results
            gdf['blind_spot_pct'] = np.random.uniform(10, 40, size=len(gdf)).round(1)
            
        if 'jarak_first_mile' not in gdf.columns:
            import numpy as np
            np.random.seed(43)
            gdf['jarak_first_mile'] = np.random.uniform(300, 1500, size=len(gdf)).round(1)
            
        if 'frekuensi' not in gdf.columns:
            import numpy as np
            np.random.seed(44)
            gdf['frekuensi'] = np.random.uniform(2, 10, size=len(gdf)).round(1)
            
        # Ensure CRS is set to EPSG:4326
        gdf.set_crs(epsg=4326, inplace=True, allow_override=True)

        # Cache the result
        GeoMapidDatasetProvider._cache = gdf
        GeoMapidDatasetProvider._cache_time = time.time()

        return gdf.copy()

def get_dataset_provider() -> BaseDatasetProvider:
    """Factory function to get the appropriate dataset provider based on settings."""
    if settings.DATA_SOURCE_MODE == "mock":
        return MockDatasetProvider()
    elif settings.DATA_SOURCE_MODE == "excel":
        return ExcelDatasetProvider()
    elif settings.DATA_SOURCE_MODE == "geomapid":
        return GeoMapidDatasetProvider()
    elif settings.DATA_SOURCE_MODE == "local_geojson":
        return LocalGeoJSONDatasetProvider()
    else:
        # Fallback to mock
        return MockDatasetProvider()
