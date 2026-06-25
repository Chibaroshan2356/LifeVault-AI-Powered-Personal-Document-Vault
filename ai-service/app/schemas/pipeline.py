"""
pipeline.py - Pydantic Schemas for AI Pipeline I/O

Every pipeline endpoint uses these models for request validation
and response serialization, which also auto-generates the OpenAPI docs.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime


# ---------------------------------------------------------------
# Stage 2 — OCR
# ---------------------------------------------------------------

class OCRResponse(BaseModel):
    success:         bool
    text:            str   = Field(..., description="Full extracted text")
    confidence:      Optional[float] = Field(None, description="Mean word confidence 0–1")
    page_count:      int   = 1
    processing_time: float = Field(..., description="Seconds")
    error:           Optional[str] = None


# ---------------------------------------------------------------
# Stage 3 — Classification
# ---------------------------------------------------------------

class ClassificationResponse(BaseModel):
    success:       bool
    document_type: str   = Field(..., description="Detected category")
    confidence:    float = Field(..., ge=0, le=1)
    error:         Optional[str] = None


# ---------------------------------------------------------------
# Stage 4+5 — Extraction & Metadata
# ---------------------------------------------------------------

class DocumentMetadata(BaseModel):
    holder_name:     Optional[str]      = None
    document_name:   Optional[str]      = None
    organization:    Optional[str]      = None
    document_number: Optional[str]      = None
    issue_date:      Optional[datetime] = None
    expiry_date:     Optional[datetime] = None


class MetadataResponse(BaseModel):
    success:    bool
    metadata:   Optional[DocumentMetadata] = None
    raw_fields: Optional[Dict[str, str]]   = None
    error:      Optional[str] = None


# ---------------------------------------------------------------
# Full pipeline — POST /process
# ---------------------------------------------------------------

class ProcessResponse(BaseModel):
    success:           bool
    ocr_text:          str
    document_type:     str
    metadata:          Optional[DocumentMetadata] = None
    confidence_scores: Dict[str, float]           = Field(default_factory=dict)
    processing_time:   float
    error:             Optional[str] = None
