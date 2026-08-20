import os
import json
import geopandas as gpd
from typing import Optional
from app.providers.base import BaseDatasetProvider
from app.core.config import settings

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

def get_dataset_provider() -> BaseDatasetProvider:
    """Factory function to get the appropriate dataset provider based on settings."""
    if settings.DATA_SOURCE_MODE == "mock":
        return MockDatasetProvider()
    elif settings.DATA_SOURCE_MODE == "excel":
        return ExcelDatasetProvider()
    else:
        # Fallback to mock
        return MockDatasetProvider()
