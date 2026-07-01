"""
Stage 2 — OCR
Uses EasyOCR for image-based OCR.
Uses PyMuPDF direct text extraction for PDFs (faster + more accurate).
"""
import logging
import time
from typing import List, Tuple
from PIL import Image
import io

logger = logging.getLogger(__name__)

# OCR confidence thresholds
MIN_CONFIDENCE_THRESHOLD = 0.7       # Below this → show warning in UI
LOW_CONFIDENCE_RETRY_THRESHOLD = 0.4  # Below this → retry with binarized images

# Lazy-load EasyOCR reader (large model, initialise once)
_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr
        logger.info("Initialising EasyOCR reader (first call may take 30s)...")
        _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        logger.info("EasyOCR reader ready")
    return _reader


def warmup_reader() -> None:
    """Pre-load the EasyOCR model at service startup to avoid cold-start timeouts."""
    _get_reader()



def extract_text_from_images(images: List[Image.Image]) -> Tuple[str, float]:
    """
    Run OCR on a list of PIL images.
    Returns (full_text, mean_confidence).
    """
    start  = time.time()
    reader = _get_reader()
    all_text   = []
    confidences = []

    for i, img in enumerate(images):
        try:
            # Convert PIL → bytes for EasyOCR
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)

            results = reader.readtext(buf.read(), detail=1, paragraph=False)

            for (_bbox, text, conf) in results:
                if text.strip():
                    all_text.append(text.strip())
                    confidences.append(conf)

            logger.debug(f"Page {i+1}: extracted {len(results)} text regions")

        except Exception as e:
            logger.error(f"OCR failed on page {i+1}: {e}")

    full_text  = "\n".join(all_text)
    mean_conf  = round(sum(confidences) / len(confidences), 4) if confidences else 0.0
    elapsed    = round(time.time() - start, 3)

    logger.info(f"OCR complete: {len(full_text)} chars, confidence={mean_conf}, time={elapsed}s")
    return full_text, mean_conf


def extract_text_from_pdf_direct(pdf_bytes: bytes) -> Tuple[str, float]:
    """
    Extract text directly from PDF (no OCR needed for text-based PDFs).
    Falls back to image OCR if no text found.
    Returns (text, confidence) — confidence is 1.0 for direct extraction.
    """
    try:
        import fitz
        doc   = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(text.strip())
        doc.close()

        if pages:
            full_text = "\n\n".join(pages)
            logger.info(f"PDF direct text extraction: {len(full_text)} chars")
            return full_text, 1.0

    except Exception as e:
        logger.warning(f"PDF direct extraction failed: {e}")

    return "", 0.0
