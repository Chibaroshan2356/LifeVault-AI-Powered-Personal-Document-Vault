"""
POST /process — Full pipeline endpoint.
Called by the Node.js backend queue worker.
Accepts a file upload, runs the full pipeline, returns structured results.
"""
import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.preprocessing.processor import preprocess, preprocess_binarized
from app.ocr.extractor import (
    extract_text_from_images, extract_text_from_pdf_direct,
    MIN_CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_RETRY_THRESHOLD
)
from app.extraction.extractor import (
    extract, 
    extract_resume_metadata, 
    extract_fee_receipt_metadata, 
    extract_identity_card_metadata, 
    extract_educational_certificate_metadata,
    extract_passport_metadata,
    extract_aadhaar_metadata,
    extract_pan_metadata,
    extract_driving_license_metadata,
    extract_internship_certificate_metadata
)
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
        ocr_method = "none"

        if mime_type == "application/pdf":
            # Try direct text extraction first (fast, accurate)
            ocr_text, ocr_conf = extract_text_from_pdf_direct(file_bytes)
            if ocr_text.strip():
                ocr_method = "pdf_direct"

        if not ocr_text.strip():
            # Image OCR (also used for image-only PDFs)
            images = preprocess(file_bytes, mime_type)
            ocr_text, ocr_conf = extract_text_from_images(images)
            ocr_method = "easyocr_enhanced"

            # ── Stage 2b: Low-confidence retry with binarized images ──
            if ocr_conf < LOW_CONFIDENCE_RETRY_THRESHOLD and ocr_conf > 0:
                logger.warning(
                    f"Low OCR confidence ({ocr_conf:.2%}) for {document_id}, "
                    f"retrying with binarized images..."
                )
                bin_images = preprocess_binarized(file_bytes, mime_type)
                bin_text, bin_conf = extract_text_from_images(bin_images)

                # Keep the better result
                if bin_conf > ocr_conf and bin_text.strip():
                    logger.info(
                        f"Binarized retry improved confidence: "
                        f"{ocr_conf:.2%} → {bin_conf:.2%}"
                    )
                    ocr_text = bin_text
                    ocr_conf = bin_conf
                    ocr_method = "easyocr_binarized"
                else:
                    logger.info(
                        f"Binarized retry did not improve "
                        f"(enhanced={ocr_conf:.2%}, binarized={bin_conf:.2%}), "
                        f"keeping enhanced result"
                    )

        if ocr_conf < MIN_CONFIDENCE_THRESHOLD and ocr_conf > 0:
            logger.warning(
                f"Final OCR confidence {ocr_conf:.2%} is below display "
                f"threshold ({MIN_CONFIDENCE_THRESHOLD:.0%}) for {document_id}"
            )

        # ── Stage 3: Extraction ───────────────────────────────────
        extracted = extract(ocr_text)

        # ── Stage 4: Classification ───────────────────────────────
        doc_type, class_conf = classify(ocr_text, extracted)

        # ── Stage 5: Metadata Refinement ──────────────────────────
        if doc_type == "Resume":
            extracted = extract_resume_metadata(ocr_text, extracted)
        elif doc_type == "Fee Receipt":
            extracted = extract_fee_receipt_metadata(ocr_text, extracted)
        elif doc_type == "Identity Card":
            extracted = extract_identity_card_metadata(ocr_text, extracted)
        elif doc_type == "Educational Certificate":
            extracted = extract_educational_certificate_metadata(ocr_text, extracted)
        elif doc_type == "Internship Certificate":
            extracted = extract_internship_certificate_metadata(ocr_text, extracted)
        elif doc_type == "Passport":
            extracted = extract_passport_metadata(ocr_text, extracted)
        elif doc_type == "Aadhaar Card":
            extracted = extract_aadhaar_metadata(ocr_text, extracted)
        elif doc_type == "PAN Card":
            extracted = extract_pan_metadata(ocr_text, extracted)
        elif doc_type == "Driving License":
            extracted = extract_driving_license_metadata(ocr_text, extracted)

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
