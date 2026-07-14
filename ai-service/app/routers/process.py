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
        words_with_boxes = []
        images = []

        if mime_type == "application/pdf":
            # Try direct text extraction first (fast, accurate)
            ocr_text, ocr_conf, words_with_boxes = extract_text_from_pdf_direct(file_bytes)
            if ocr_text.strip():
                ocr_method = "pdf_direct"
                # Render pages for LayoutLMv3 multimodal input
                images = preprocess(file_bytes, mime_type)

        if not ocr_text.strip():
            # Image OCR (also used for image-only PDFs)
            images = preprocess(file_bytes, mime_type)
            ocr_text, ocr_conf, words_with_boxes = extract_text_from_images(images)
            ocr_method = "easyocr_enhanced"

            # ── Stage 2b: Low-confidence retry with binarized images ──
            if ocr_conf < LOW_CONFIDENCE_RETRY_THRESHOLD and ocr_conf > 0:
                logger.warning(
                    f"Low OCR confidence ({ocr_conf:.2%}) for {document_id}, "
                    f"retrying with binarized images..."
                )
                bin_images = preprocess_binarized(file_bytes, mime_type)
                bin_text, bin_conf, bin_words_with_boxes = extract_text_from_images(bin_images)

                # Keep the better result
                if bin_conf > ocr_conf and bin_text.strip():
                    logger.info(
                        f"Binarized retry improved confidence: "
                        f"{ocr_conf:.2%} → {bin_conf:.2%}"
                    )
                    ocr_text = bin_text
                    ocr_conf = bin_conf
                    words_with_boxes = bin_words_with_boxes
                    images = bin_images
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

        # ── Stage 3: Extraction (Rule-Based Base) ─────────────────
        extracted = extract(ocr_text)

        # ── Stage 4: Classification ───────────────────────────────
        doc_type, class_conf = classify(ocr_text, extracted)

        # ── Stage 5: Rule-Based Metadata Refinement ───────────────
        rule_based_extracted = dict(extracted)
        if doc_type == "Resume":
            rule_based_extracted = extract_resume_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Fee Receipt":
            rule_based_extracted = extract_fee_receipt_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Identity Card":
            rule_based_extracted = extract_identity_card_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Educational Certificate":
            rule_based_extracted = extract_educational_certificate_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Internship Certificate":
            rule_based_extracted = extract_internship_certificate_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Passport":
            rule_based_extracted = extract_passport_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Aadhaar Card":
            rule_based_extracted = extract_aadhaar_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "PAN Card":
            rule_based_extracted = extract_pan_metadata(ocr_text, rule_based_extracted)
        elif doc_type == "Driving License":
            rule_based_extracted = extract_driving_license_metadata(ocr_text, rule_based_extracted)

        # ── Stage 6: LayoutLMv3 Inference & Fallback Merge ───────
        layoutlm_results = {}
        first_page_words = [wb for wb in words_with_boxes if wb.get("page") == 0]

        if first_page_words and images:
            first_page_image = images[0]
            words_list = [wb["text"] for wb in first_page_words]
            boxes_list = [wb["box"] for wb in first_page_words]

            try:
                from app.services.layoutlm_inference import layoutlm_inference_service
                layoutlm_results = layoutlm_inference_service.predict(
                    first_page_image, words_list, boxes_list
                )
            except Exception as e:
                logger.error(f"LayoutLMv3 prediction failed, falling back to 100% rule-based: {e}", exc_info=True)
                layoutlm_results = {}

        # Merge extracted metadata based on confidence threshold (0.70)
        final_extracted = {}
        for field in ["documentName", "holderName", "organization", "documentNumber", "issueDate", "expiryDate"]:
            llm_ent = layoutlm_results.get(field)
            if llm_ent and llm_ent["confidence"] >= 0.70:
                val = llm_ent["value"]
                # Normalise dates predicted by LayoutLMv3
                if field in ["issueDate", "expiryDate"]:
                    from app.extraction.extractor import _normalise_date
                    val = _normalise_date(val)
                final_extracted[field] = val
                logger.info(f"Field '{field}' extracted by LayoutLMv3 with confidence {llm_ent['confidence']:.2%}")
            else:
                final_extracted[field] = rule_based_extracted.get(field)
                reason = "below threshold" if llm_ent else "missing prediction"
                logger.info(f"Field '{field}' falls back to rule-based ({reason})")

        processing_time = round(time.time() - start_time, 3)

        # Update version info dynamically in response to show layoutlmv3 is active
        version_info = AIVersionInfo(
            ocr_engine="EasyOCR",
            ocr_version="1.7.2",
            classification_model="RuleBased",
            classification_version="1.0",
            extraction_model="LayoutLMv3+Regex" if layoutlm_results else "RegexBased",
            extraction_version="1.1" if layoutlm_results else "1.0"
        )

        return ProcessResponse(
            success=True,
            document_id=document_id,
            ocr_text=ocr_text,
            ocr_confidence=ocr_conf,
            document_type=doc_type,
            classification_confidence=class_conf,
            metadata=DocumentMetadata(
                documentName   = final_extracted.get("documentName"),
                holderName     = final_extracted.get("holderName"),
                organization   = final_extracted.get("organization"),
                documentNumber = final_extracted.get("documentNumber"),
                issueDate      = final_extracted.get("issueDate"),
                expiryDate     = final_extracted.get("expiryDate"),
            ),
            processing_time=processing_time,
            version_info=version_info
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
