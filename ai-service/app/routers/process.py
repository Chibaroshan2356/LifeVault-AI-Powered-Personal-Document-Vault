"""
POST /process — Full pipeline endpoint.
Called by the Node.js backend queue worker.
Accepts a file upload, runs the full pipeline, returns structured results.
"""
import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.preprocessing.processor import preprocess
from app.ocr.extractor import extract_text_from_images, extract_text_from_pdf_direct
from app.extraction.extractor import extract
from app.classification.classifier import classify
from app.schemas.pipeline import ProcessResponse, DocumentMetadata, AIVersionInfo

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/process", response_model=ProcessResponse)
async def process_document(
    file:        UploadFile = File(...),
    document_id: str        = Form(...),
):
    """
    Full AI pipeline:
      1. Preprocessing
      2. OCR (EasyOCR for images, PyMuPDF direct for PDFs)
      3. Information Extraction
      4. Classification
    Returns structured ProcessResponse.
    """
    start_time = time.time()
    file_bytes = await file.read()
    mime_type  = file.content_type or "application/octet-stream"

    logger.info(f"Processing document_id={document_id}, mime={mime_type}, size={len(file_bytes)}")

    try:
        # ── Stage 2: OCR ──────────────────────────────────────────
        ocr_text   = ""
        ocr_conf   = 0.0

        if mime_type == "application/pdf":
            # Try direct text extraction first (fast, accurate)
            ocr_text, ocr_conf = extract_text_from_pdf_direct(file_bytes)

        if not ocr_text.strip():
            # Image OCR (also used for image-only PDFs)
            images = preprocess(file_bytes, mime_type)
            ocr_text, ocr_conf = extract_text_from_images(images)

        # ── Stage 3: Extraction ───────────────────────────────────
        extracted = extract(ocr_text)

        # ── Stage 4: Classification ───────────────────────────────
        doc_type, class_conf = classify(ocr_text, extracted)

        processing_time = round(time.time() - start_time, 3)

        return ProcessResponse(
            success=True,
            document_id=document_id,
            ocr_text=ocr_text,
            ocr_confidence=ocr_conf,
            document_type=doc_type,
            classification_confidence=class_conf,
            metadata=DocumentMetadata(
                documentName   = extracted.get("documentName"),
                holderName     = extracted.get("holderName"),
                organization   = extracted.get("organization"),
                documentNumber = extracted.get("documentNumber"),
                issueDate      = extracted.get("issueDate"),
                expiryDate     = extracted.get("expiryDate"),
            ),
            processing_time=processing_time,
        )

    except Exception as e:
        logger.error(f"Pipeline error for {document_id}: {e}", exc_info=True)
        return ProcessResponse(
            success=False,
            document_id=document_id,
            ocr_text="",
            ocr_confidence=0.0,
            document_type="Other",
            classification_confidence=0.0,
            metadata=DocumentMetadata(),
            processing_time=round(time.time() - start_time, 3),
            error=str(e),
        )
