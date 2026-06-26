"""
pipeline.py - Pydantic Schemas for AI Pipeline I/O

All pipeline endpoints use these models for:
  - Request body validation
  - Response serialization
  - Auto-generated OpenAPI documentation (/docs)

AI versioning is embedded in every response so that:
  - Results are reproducible and auditable
  - Future model upgrades can be compared against historical results
  - The backend stores which model version produced each OCR result
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime


# ---------------------------------------------------------------
# AI Version Info — included in every pipeline response
# ---------------------------------------------------------------

class AIVersionInfo(BaseModel):
    """
    Metadata about the AI models used to produce this result.
    Stored in MongoDB alongside the OCR text and metadata.
    """
    ocr_engine:               str = "DocTR"
    ocr_version:              str = "0.8.1"
    classification_model:     str = "RuleBased"      # updated to "LayoutLMv3" in Phase 2
    classification_version:   str = "1.0"
    extraction_model:         str = "RegexBased"
    extraction_version:       str = "1.0"


# ---------------------------------------------------------------
# Stage 2 — OCR
# ---------------------------------------------------------------

class OCRResponse(BaseModel):
    success:         bool
    text:            str   = Field(..., description="Full extracted text from document")
    confidence:      Optional[float] = Field(None, ge=0, le=1, description="Mean word confidence")
    page_count:      int   = Field(1, description="Number of pages processed")
    processing_time: float = Field(..., description="Inference time in seconds")
    version_info:    AIVersionInfo = Field(default_factory=AIVersionInfo)
    error:           Optional[str] = None


# ---------------------------------------------------------------
# Stage 3 — Classification
# ---------------------------------------------------------------

class ClassificationResponse(BaseModel):
    success:       bool
    document_type: str   = Field(..., description="Detected document category")
    confidence:    float = Field(..., ge=0, le=1)
    version_info:  AIVersionInfo = Field(default_factory=AIVersionInfo)
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
    success:      bool
    metadata:     Optional[DocumentMetadata] = None
    raw_fields:   Optional[Dict[str, str]]   = None
    version_info: AIVersionInfo = Field(default_factory=AIVersionInfo)
    error:        Optional[str] = None


# ---------------------------------------------------------------
# Full Pipeline — POST /process
# Called by the Express backend after file upload
# ---------------------------------------------------------------

class ProcessRequest(BaseModel):
    """Request body sent by the Express backend."""
    document_id: str   = Field(..., description="MongoDB document ID")
    file_path:   str   = Field(..., description="Path to the file on the AI service's filesystem")
    mime_type:   str   = Field(..., description="MIME type of the file")
    user_id:     str   = Field(..., description="Owner's user ID")


class ProcessResponse(BaseModel):
    """Full pipeline result returned to the Express backend."""
    success:               bool
    document_id:           str
    ocr_text:              str
    ocr_confidence:        float
    document_type:         str
    classification_confidence: float
    metadata:              Optional[DocumentMetadata] = None
    processing_time:       float   = Field(..., description="Total pipeline time in seconds")
    version_info:          AIVersionInfo = Field(default_factory=AIVersionInfo)
    error:                 Optional[str] = None


# ---------------------------------------------------------------
# Health
# ---------------------------------------------------------------

class HealthResponse(BaseModel):
    status:      str
    service:     str
    version:     str
    environment: str
