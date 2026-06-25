"""Logging configuration for the AI service."""
import logging
import os
from logging.handlers import RotatingFileHandler
from app.core.config import settings


def setup_logging() -> None:
    os.makedirs("logs", exist_ok=True)

    fmt = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format=fmt,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(),
            RotatingFileHandler(
                "logs/ai_service.log",
                maxBytes=5 * 1024 * 1024,
                backupCount=5,
            ),
        ],
    )
    logging.getLogger("uvicorn").setLevel(logging.INFO)
