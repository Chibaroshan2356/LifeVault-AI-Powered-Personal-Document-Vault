"""
tools/ocr_pipeline.py
=====================
Shared OCR utilities for the LifeVault dataset preparation framework.

Supports:
  - Text-based PDFs  → PyMuPDF direct word extraction
  - Scanned PDFs     → PyMuPDF rasterize → EasyOCR
  - Images (PNG/JPG) → EasyOCR directly

Public API:
  get_word_boxes(file_path)  -> (words: list[WordBox], width: int, height: int)
  render_to_png(src_path, png_path) -> None
"""

import os
import io
import logging
from typing import NamedTuple

logger = logging.getLogger(__name__)

# Type alias: each word entry returned by any extractor
WordBox = dict  # {"text": str, "box": [x0, y0, x1, y1], "page": int}

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}
PDF_EXT    = ".pdf"


# ── Coordinate normaliser ─────────────────────────────────────────────────────

def _norm_box(bbox: tuple, page_width: float, page_height: float) -> list[int]:
    """
    Normalize a bounding box to 1000×1000 space (LayoutLMv3 convention).
    Input:  (x0, y0, x1, y1) in pixel or point coordinates.
    Output: [x0, y0, x1, y1] as integers in [0, 1000].
    """
    x0, y0, x1, y1 = bbox
    sx = 1000.0 / max(page_width,  1)
    sy = 1000.0 / max(page_height, 1)
    return [
        max(0,    int(x0 * sx)),
        max(0,    int(y0 * sy)),
        min(1000, int(x1 * sx)),
        min(1000, int(y1 * sy)),
    ]


# ── PDF extractor — PyMuPDF (text-based) ─────────────────────────────────────

def extract_words_pymupdf(pdf_path: str) -> tuple[list[WordBox], int, int]:
    """
    Extract word-level bounding boxes from a text-based PDF using PyMuPDF.
    Returns: (words, page_width, page_height)
    """
    try:
        import fitz
        doc    = fitz.open(pdf_path)
        words: list[WordBox] = []
        pw, ph = 0, 0

        for page_num, page in enumerate(doc):
            pw = max(pw, int(page.rect.width))
            ph = max(ph, int(page.rect.height))

            for w in page.get_text("words"):
                x0, y0, x1, y1, text = w[0], w[1], w[2], w[3], w[4]
                text = text.strip()
                if not text:
                    continue
                # Apply page y-offset (in raw coordinates) BEFORE normalization
                # so y0 and y1 remain consistent (y0 < y1 guaranteed).
                y_offset = page_num * page.rect.height
                sx = 1000.0 / max(page.rect.width,  1)
                sy = 1000.0 / max(page.rect.height, 1)
                box = [
                    max(0,    int(x0 * sx)),
                    max(0,    int((y0 + y_offset) * sy)),
                    min(1000, int(x1 * sx)),
                    max(0,    int((y1 + y_offset) * sy)),
                ]
                words.append({"text": text, "box": box, "page": page_num})

        doc.close()
        return words, pw, ph

    except Exception as e:
        logger.warning(f"PyMuPDF extraction failed ({os.path.basename(pdf_path)}): {e}")
        return [], 0, 0


# ── PDF extractor — EasyOCR fallback (scanned PDFs) ─────────────────────────

def extract_words_easyocr_from_pdf(pdf_path: str) -> tuple[list[WordBox], int, int]:
    """
    Rasterize the first PDF page and run EasyOCR on it.
    Returns: (words, page_width, page_height)
    """
    try:
        import fitz
        from PIL import Image

        doc  = fitz.open(pdf_path)
        page = doc[0]
        pix  = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))
        pw, ph = img.size
        doc.close()

        return _run_easyocr(img_bytes, pw, ph)

    except Exception as e:
        logger.warning(f"EasyOCR-PDF extraction failed ({os.path.basename(pdf_path)}): {e}")
        return [], 0, 0


# ── Image extractor — EasyOCR direct ─────────────────────────────────────────

def extract_words_from_image(img_path: str) -> tuple[list[WordBox], int, int]:
    """
    Run EasyOCR directly on a PNG / JPG / JPEG image.
    Returns: (words, page_width, page_height)
    """
    try:
        from PIL import Image
        img = Image.open(img_path).convert("RGB")
        pw, ph = img.size

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()

        return _run_easyocr(img_bytes, pw, ph)

    except Exception as e:
        logger.warning(f"Image OCR failed ({os.path.basename(img_path)}): {e}")
        return [], 0, 0


def _run_easyocr(img_bytes: bytes, pw: int, ph: int) -> tuple[list[WordBox], int, int]:
    """Internal: run EasyOCR on raw PNG bytes, return normalized WordBoxes."""
    try:
        import easyocr
        reader  = easyocr.Reader(["en"], gpu=False, verbose=False)
        results = reader.readtext(img_bytes, detail=1, paragraph=False)

        words: list[WordBox] = []
        for (bbox_pts, text, _conf) in results:
            text = text.strip()
            if not text:
                continue
            xs  = [p[0] for p in bbox_pts]
            ys  = [p[1] for p in bbox_pts]
            box = _norm_box((min(xs), min(ys), max(xs), max(ys)), pw, ph)
            words.append({"text": text, "box": box, "page": 0})

        return words, pw, ph

    except Exception as e:
        logger.warning(f"EasyOCR failed: {e}")
        return [], 0, 0


# ── Public dispatcher ─────────────────────────────────────────────────────────

def get_word_boxes(file_path: str) -> tuple[list[WordBox], int, int]:
    """
    Dispatch OCR based on file extension.
    - .pdf  → PyMuPDF first, EasyOCR fallback
    - image → EasyOCR directly
    Returns: (words, page_width, page_height)
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == PDF_EXT:
        words, pw, ph = extract_words_pymupdf(file_path)
        if words:
            return words, pw, ph
        logger.info(f"Falling back to EasyOCR for: {os.path.basename(file_path)}")
        return extract_words_easyocr_from_pdf(file_path)

    elif ext in IMAGE_EXTS:
        return extract_words_from_image(file_path)

    else:
        logger.warning(f"Unsupported file type: {ext} — skipping {file_path}")
        return [], 0, 0


# ── PNG renderer (for validator image_filename checks) ────────────────────────

def render_to_png(src_path: str, png_path: str) -> bool:
    """
    Render the first page of a PDF (or copy an image) to a PNG companion file.
    Returns True on success, False on failure.
    """
    ext = os.path.splitext(src_path)[1].lower()
    try:
        if ext == PDF_EXT:
            import fitz
            doc  = fitz.open(src_path)
            page = doc[0]
            pix  = page.get_pixmap(matrix=fitz.Matrix(1.0, 1.0))
            pix.save(png_path)
            doc.close()
        elif ext in IMAGE_EXTS:
            from PIL import Image
            img = Image.open(src_path).convert("RGB")
            img.save(png_path, format="PNG")
        else:
            return False
        return True
    except Exception as e:
        logger.warning(f"Could not render PNG for {os.path.basename(src_path)}: {e}")
        return False
