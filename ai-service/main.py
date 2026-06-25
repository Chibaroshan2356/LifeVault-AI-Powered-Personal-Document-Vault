"""
main.py - FastAPI Application Entry Point

Pipeline flow:
  Upload → Preprocessing → OCR → Classification → Extraction → Metadata → Response

Each stage is a separate module under app/:
  app/preprocessing/  — image quality + deskew
  app/ocr/            — DocTR text extraction
  app/classification/ — document type detection
  app/extraction/     — named-entity extraction
  app/metadata/       — structured metadata assembly
  app/routers/        — FastAPI route handlers
  app/schemas/        — Pydantic I/O models
  app/core/           — config, logging, exceptions
"""
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging

# Routers — uncommented as each pipeline stage is implemented
# from app.routers import ocr, classification, extraction, process

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hooks."""
    logger.info("🚀  LifeVault AI Service starting…")
    logger.info(f"    Environment : {settings.ENVIRONMENT}")
    logger.info(f"    OCR model   : {settings.OCR_MODEL}")
    logger.info(f"    GPU enabled : {settings.USE_GPU}")
    yield
    logger.info("⚠️   LifeVault AI Service shutting down…")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OCR & document intelligence pipeline for LifeVault",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow calls from the Express backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health():
    """Service health check."""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "LifeVault AI Service",
        "version": settings.APP_VERSION,
        "pipeline": [
            "preprocessing",
            "ocr",
            "classification",
            "extraction",
            "metadata",
        ],
        "docs": "/docs",
    }

# Mount pipeline routers as implemented:
# app.include_router(ocr.router,            prefix="/ocr",            tags=["OCR"])
# app.include_router(classification.router, prefix="/classify",       tags=["Classification"])
# app.include_router(extraction.router,     prefix="/extract",        tags=["Extraction"])
# app.include_router(process.router,        prefix="/process",        tags=["Full Pipeline"])
