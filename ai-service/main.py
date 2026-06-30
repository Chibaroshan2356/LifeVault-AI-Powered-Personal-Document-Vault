"""LifeVault AI Service — FastAPI entry point."""
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.process import router as process_router
from app.ocr.extractor import warmup_reader

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"LifeVault AI Service starting (env={settings.ENVIRONMENT})")
    # Pre-load EasyOCR model so the first document request doesn't time out.
    # run_in_executor keeps the event loop unblocked while PyTorch loads.
    logger.info("Pre-loading EasyOCR model (this may take up to 60s on first run)...")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, warmup_reader)
    logger.info("EasyOCR model ready — service accepting requests")
    yield
    logger.info("LifeVault AI Service shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OCR & document intelligence pipeline",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/", tags=["Root"])
async def root():
    return {"message": "LifeVault AI Service", "version": settings.APP_VERSION, "docs": "/docs"}


app.include_router(process_router, tags=["Pipeline"])
