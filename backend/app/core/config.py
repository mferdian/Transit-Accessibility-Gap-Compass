import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Transit Accessibility Gap Compass"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    
    # Provider Modes
    DATA_SOURCE_MODE: str = "mock"
    GEO_API_MODE: str = "mock"
    VISION_MODE: str = "mock"

    # Credentials & Paths
    EXCEL_FILE_PATH: str = "data/kelurahan_data.xlsx"
    GEOMAPID_API_KEY: str = ""
    GEOMAPID_API_URL: str = "https://api.mapid.io/v1"
    VLM_API_KEY: str = ""
    VLM_PROVIDER: str = "gemini"

    # CORS Origins.
    # BACKEND_CORS_ORIGINS is a JSON-formatted list of origins, e.g: '["http://localhost:3000"]'
    # or a comma-separated string, e.g: "http://localhost:3000,http://localhost:3001"
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
