"""
Stage 1 — Preprocessing
Converts uploaded bytes to a list of PIL images ready for OCR.
Handles PDF (via PyMuPDF) and images (via Pillow).
"""
import io
import logging
from typing import List
from PIL import Image
import numpy as np
import cv2

logger = logging.getLogger(__name__)


def preprocess(file_bytes: bytes, mime_type: str) -> List[Image.Image]:
    """
    Convert file bytes to a list of preprocessed PIL Images.
    PDF: one image per page.
    Image: single-element list.
    """
    if mime_type == "application/pdf":
        return _pdf_to_images(file_bytes)
    else:
        return [_preprocess_image(file_bytes)]


def _pdf_to_images(pdf_bytes: bytes) -> List[Image.Image]:
    """Render each PDF page to a PIL Image using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        for page in doc:
            mat  = fitz.Matrix(2.0, 2.0)  # 2x scale → ~144 DPI
            pix  = page.get_pixmap(matrix=mat)
            img  = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        doc.close()
        logger.info(f"PDF rendered to {len(images)} page(s)")
        return images if images else [Image.new("RGB", (800, 600), "white")]
    except Exception as e:
        logger.error(f"PDF rendering failed: {e}")
        return [Image.new("RGB", (800, 600), "white")]


def _preprocess_image(img_bytes: bytes) -> Image.Image:
    """Enhance image quality for OCR: deskew + denoise."""
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        # Convert to numpy for OpenCV processing
        arr = np.array(img)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        # Adaptive threshold for better text contrast
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        return Image.fromarray(thresh)
    except Exception as e:
        logger.warning(f"Image preprocessing failed, using original: {e}")
        return Image.open(io.BytesIO(img_bytes)).convert("RGB")
