"""
config.py - Application Configuration

Purpose: Centralized configuration using Pydantic Settings.
Reads environment variables and provides typed, validated config.

Why Pydantic Settings?
  - Type validation for all config values
  - Automatic environment variable loading
  - Clear error messages for missing/invalid config
  - IDE autocomplete support

Usage:
  from app.core.config import settings
  max_size = settings.MAX_FILE_SIZE
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Pydantic validates types and provides defaults.
    """

    # ============================================================
    # Application
    # ============================================================
    APP_NAME: str = "LifeVault AI Service"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # ============================================================
    # Server
    # ============================================================
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ============================================================
    # File Processing
    # ============================================================
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB in bytes
    ALLOWED_FILE_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
    ]
    UPLOAD_DIR: str = "temp_uploads"

    # ============================================================
    # OCR Configuration
    # ============================================================
    OCR_MODEL: str = "db_resnet50"  # DocTR model
    USE_GPU: bool = False            # Enable GPU acceleration

    # ============================================================
    # CORS
    # ============================================================
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:4200",
    ]

    # ============================================================
    # Logging
    # ============================================================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/ai_service.log"

    class Config:
        """
        Pydantic config class.
        Tells Pydantic to load values from a .env file.
        """
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()
