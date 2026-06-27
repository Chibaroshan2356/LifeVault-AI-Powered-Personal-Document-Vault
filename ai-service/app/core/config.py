"""AI Service configuration."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME:        str  = "LifeVault AI Service"
    APP_VERSION:     str  = "1.0.0"
    ENVIRONMENT:     str  = "development"
    HOST:            str  = "0.0.0.0"
    PORT:            int  = 8000
    MAX_FILE_SIZE:   int  = 10 * 1024 * 1024
    UPLOAD_DIR:      str  = "temp_uploads"
    ALLOWED_TYPES:   List[str] = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    USE_GPU:         bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4200"]
    LOG_LEVEL:       str  = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
