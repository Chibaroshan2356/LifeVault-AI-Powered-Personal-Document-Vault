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



def extract_text_from_images(images: List[Image.Image]) -> Tuple[str, float, List[dict]]:
    """
    Run OCR on a list of PIL images.
    Returns (full_text, mean_confidence, words_with_boxes).
    """
    start  = time.time()
    reader = _get_reader()
    all_text   = []
    confidences = []
    words_with_boxes = []

    for i, img in enumerate(images):
        try:
            # Convert PIL → bytes for EasyOCR
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)

            results = reader.readtext(buf.read(), detail=1, paragraph=False)

            for (bbox, text, conf) in results:
                text_clean = text.strip()
                if text_clean:
                    all_text.append(text_clean)
                    confidences.append(conf)
                    
                    # Convert EasyOCR 4-point box to [x0, y0, x1, y1] bounding box
                    xs = [pt[0] for pt in bbox]
                    ys = [pt[1] for pt in bbox]
                    words_with_boxes.append({
                        "text": text_clean,
                        "box": [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
                        "page": i
                    })

            logger.debug(f"Page {i+1}: extracted {len(results)} text regions")

        except Exception as e:
            logger.error(f"OCR failed on page {i+1}: {e}")

    full_text  = "\n".join(all_text)
    mean_conf  = round(sum(confidences) / len(confidences), 4) if confidences else 0.0
    elapsed    = round(time.time() - start, 3)

    logger.info(f"OCR complete: {len(full_text)} chars, confidence={mean_conf}, time={elapsed}s")
    return full_text, mean_conf, words_with_boxes


def extract_text_from_pdf_direct(pdf_bytes: bytes) -> Tuple[str, float, List[dict]]:
    """
    Extract text directly from PDF (no OCR needed for text-based PDFs).
    Falls back to image OCR if no text found.
    Returns (text, confidence, words_with_boxes).
    """
    try:
        import fitz
        doc   = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        words_with_boxes = []
        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            if text.strip():
                pages.append(text.strip())
            
            # Extract word-level tokens and boxes
            for w in page.get_text("words"):
                x0, y0, x1, y1, word = w[0], w[1], w[2], w[3], w[4]
                word_clean = word.strip()
                if word_clean:
                    words_with_boxes.append({
                        "text": word_clean,
                        "box": [int(x0), int(y0), int(x1), int(y1)],
                        "page": page_num
                    })
        doc.close()

        if pages:
            full_text = "\n\n".join(pages)
            logger.info(f"PDF direct text extraction: {len(full_text)} chars")
            return full_text, 1.0, words_with_boxes

    except Exception as e:
        logger.warning(f"PDF direct extraction failed: {e}")

    return "", 0.0, []
