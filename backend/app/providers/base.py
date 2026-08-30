from abc import ABC, abstractmethod
import geopandas as gpd
from typing import Dict, Any, List

class BaseDatasetProvider(ABC):
    @abstractmethod
    def load_kelurahan_geodataframe(self) -> gpd.GeoDataFrame:
        """Loads kelurahan dataset into a GeoDataFrame."""
        pass

class BaseGeoSpatialProvider(ABC):
    @abstractmethod
    def get_existing_haltes(self) -> List[Dict[str, Any]]:
        """Returns a list of existing haltes (stops) with properties and geometry."""
        pass

    @abstractmethod
    def get_road_network(self) -> gpd.GeoDataFrame:
        """Returns the road network as a GeoDataFrame (LineStrings)."""
        pass

class BaseVisionProvider(ABC):
    @abstractmethod
    def analyze_halte_image(self, image_base64: str | None = None, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """Analyzes an image and returns a dictionary matching VisionFeatureDetection schema."""
        pass
