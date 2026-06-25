"""
logging_config.py - Logging Configuration

Purpose: Configures Python's logging module for the AI service.

Features:
  - Console and file logging
  - Configurable log levels
  - Formatted timestamps and messages
  - Separate error log file

Usage:
  from app.core.logging_config import setup_logging
  setup_logging()
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from app.core.config import settings


def setup_logging() -> None:
    """
    Configure logging for the AI service.
    Sets up both console and file handlers.
    """

    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(settings.LOG_FILE)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)

    # Log format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # Root logger configuration
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format=log_format,
        datefmt=date_format,
        handlers=[
            # Console handler
            logging.StreamHandler(),
            # File handler with rotation
            RotatingFileHandler(
                settings.LOG_FILE,
                maxBytes=5 * 1024 * 1024,  # 5MB
                backupCount=5,
            ),
        ],
    )

    # Set uvicorn logging level
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
