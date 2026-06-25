"""
exceptions.py - Custom Exceptions

Raised inside pipeline stages and caught by FastAPI exception handlers
to return consistent JSON error responses.
"""
from fastapi import HTTPException


class UnsupportedFileTypeError(HTTPException):
    def __init__(self, mime_type: str):
        super().__init__(
            status_code=415,
            detail=f"Unsupported file type: {mime_type}",
        )


class FileTooLargeError(HTTPException):
    def __init__(self, max_bytes: int):
        super().__init__(
            status_code=413,
            detail=f"File exceeds maximum size of {max_bytes // (1024*1024)} MB",
        )


class OCRProcessingError(HTTPException):
    def __init__(self, reason: str = "OCR processing failed"):
        super().__init__(status_code=500, detail=reason)


class ClassificationError(HTTPException):
    def __init__(self, reason: str = "Document classification failed"):
        super().__init__(status_code=500, detail=reason)
