"""
schemas.py - Pydantic Data Models

Purpose: Defines request/response schemas for the AI service API.

Why Pydantic Models?
  - Automatic request validation
  - Type safety
  - Auto-generated API documentation
  - Serialization/deserialization

Usage:
  from app.models.schemas import OCRResponse
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ============================================================
# OCR Models
# ============================================================

class OCRRequest(BaseModel):
    """Request model for OCR processing."""
    file_path: str = Field(..., description="Path to the uploaded file")
    preprocess: bool = Field(default=True, description="Apply image preprocessing")


class OCRResponse(BaseModel):
    """Response model for OCR processing."""
    success: bool
    text: str = Field(..., description="Extracted text from document")
    confidence: Optional[float] = Field(None, description="OCR confidence score")
    processing_time: float = Field(..., description="Processing time in seconds")
    error: Optional[str] = None


# ============================================================
# Document Classification Models
# ============================================================

class ClassificationResponse(BaseModel):
    """Response model for document classification."""
    success: bool
    document_type: str = Field(..., description="Detected document category")
    confidence: float = Field(..., description="Classification confidence")
    error: Optional[str] = None


# ============================================================
# Metadata Extraction Models
# ============================================================

class DocumentMetadata(BaseModel):
    """Extracted metadata from a document."""
    holder_name: Optional[str] = None
    document_name: Optional[str] = None
    organization: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    document_number: Optional[str] = None


class MetadataResponse(BaseModel):
    """Response model for metadata extraction."""
    success: bool
    metadata: Optional[DocumentMetadata] = None
    raw_fields: Optional[Dict[str, str]] = None
    error: Optional[str] = None


# ============================================================
# Full Processing Pipeline Models
# ============================================================

class ProcessDocumentResponse(BaseModel):
    """Response for full document processing pipeline."""
    success: bool
    ocr_text: str
    document_type: str
    metadata: Optional[DocumentMetadata] = None
    confidence_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Confidence scores for each processing step"
    )
    processing_time: float
    error: Optional[str] = None


# ============================================================
# Health Check Models
# ============================================================

class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str
    service: str
    version: str
    environment: str
