"""
main.py - FastAPI Application Entry Point

Purpose: Creates and configures the FastAPI application instance.
This is the entry point for the AI service.

Responsibilities:
  - Create FastAPI app with metadata
  - Configure CORS middleware
  - Include API routers
  - Add health check endpoint
  - Configure exception handlers

Usage:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

# Core configuration
from app.core.config import settings
from app.core.logging_config import setup_logging

# API routes (will be implemented in subsequent phases)
# from app.api.routes import ocr, classification, extraction

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Replaces deprecated @app.on_event("startup") and @app.on_event("shutdown").
    """
    # Startup logic
    logger.info("🚀 Starting LifeVault AI Service...")
    logger.info(f"📝 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🔧 OCR Model: {settings.OCR_MODEL}")
    logger.info(f"💻 GPU Enabled: {settings.USE_GPU}")

    yield  # Application runs

    # Shutdown logic
    logger.info("⚠️  Shutting down LifeVault AI Service...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered document intelligence service for LifeVault",
    docs_url="/docs",        # Swagger UI endpoint
    redoc_url="/redoc",      # ReDoc endpoint
    lifespan=lifespan,
)

# ============================================================
# CORS Middleware
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Health Check Endpoint
# ============================================================
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.

    Returns service status and configuration info.
    """
    return JSONResponse(
        content={
            "status": "ok",
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }
    )


# ============================================================
# API Routes
# ============================================================
# TODO: Include API routers in subsequent phases
# app.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
# app.include_router(classification.router, prefix="/classify", tags=["Classification"])
# app.include_router(extraction.router, prefix="/extract", tags=["Extraction"])


# ============================================================
# Root Endpoint
# ============================================================
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - provides API overview.
    """
    return {
        "message": "LifeVault AI Service",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
