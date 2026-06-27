"""Pydantic schemas for all pipeline API endpoints."""
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime


class AIVersionInfo(BaseModel):
    ocr_engine:             str = "EasyOCR"
    ocr_version:            str = "1.7.2"
    classification_model:   str = "RuleBased"
    classification_version: str = "1.0"
    extraction_model:       str = "RegexBased"
    extraction_version:     str = "1.0"


class DocumentMetadata(BaseModel):
    documentName:    Optional[str] = None
    holderName:      Optional[str] = None
    organization:    Optional[str] = None
    documentNumber:  Optional[str] = None
    issueDate:       Optional[str] = None
    expiryDate:      Optional[str] = None


class ProcessResponse(BaseModel):
    success:                   bool
    document_id:               str
    ocr_text:                  str
    ocr_confidence:            float
    document_type:             str
    classification_confidence: float
    metadata:                  DocumentMetadata
    processing_time:           float
    version_info:              AIVersionInfo = Field(default_factory=AIVersionInfo)
    error:                     Optional[str] = None


class HealthResponse(BaseModel):
    status:      str
    service:     str
    version:     str
    environment: str
