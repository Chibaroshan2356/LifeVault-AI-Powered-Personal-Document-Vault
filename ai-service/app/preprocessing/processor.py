"""
Stage 1 — Preprocessing
Universal image enhancement pipeline for OCR quality improvement.
Handles PDF (via PyMuPDF) and images (via Pillow/OpenCV).

Pipeline stages (applied to every document image):
  1. Load & convert to RGB numpy array
  2. Auto-orientation (EXIF tags + skew detection/correction)
  3. Upscale low-resolution images (< 1000px shortest side)
  4. Color-preserving denoising (fastNlMeansDenoisingColored)
  5. CLAHE contrast enhancement (LAB color space, L-channel only)
  6. Unsharp mask sharpening
  7. Return as PIL Image for EasyOCR
"""
import io
import logging
import math
from typing import List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────
# Configuration constants
# ──────────────────────────────────────────────────────────────────
_MIN_DIMENSION = 1000          # Upscale if shortest side < this
_UPSCALE_TARGET = 1500         # Target shortest side after upscale
_CLAHE_CLIP_LIMIT = 2.0        # CLAHE clip limit
_CLAHE_TILE_SIZE = (8, 8)      # CLAHE grid size
_DENOISE_H_COLOR = 6           # Denoising strength (color)
_DENOISE_H_LUMINANCE = 6       # Denoising strength (luminance)
_PDF_SCALE_FACTOR = 2.5        # PDF rendering scale (~180 DPI)
_MAX_SKEW_ANGLE = 15.0         # Maximum deskew angle (degrees)


# ══════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════

def preprocess(file_bytes: bytes, mime_type: str) -> List[Image.Image]:
    """
    Convert file bytes to a list of preprocessed PIL Images.
    PDF: one enhanced image per page.
    Image: single-element list.
    """
    if mime_type == "application/pdf":
        return _pdf_to_images(file_bytes)
    else:
        return [_preprocess_image(file_bytes)]


def preprocess_binarized(file_bytes: bytes, mime_type: str) -> List[Image.Image]:
    """
    Aggressive binarization fallback for very low-confidence OCR results.
    Applies the full pipeline PLUS adaptive thresholding to produce
    high-contrast black-and-white images.
    """
    if mime_type == "application/pdf":
        images = _pdf_to_images(file_bytes)
    else:
        images = [_preprocess_image(file_bytes)]

    binarized = []
    for img in images:
        try:
            arr = np.array(img)
            gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
            thresh = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 31, 10
            )
            binarized.append(Image.fromarray(thresh))
        except Exception as e:
            logger.warning(f"Binarization fallback failed, using enhanced image: {e}")
            binarized.append(img)
    return binarized


# ══════════════════════════════════════════════════════════════════
# PDF HANDLING
# ══════════════════════════════════════════════════════════════════

def _pdf_to_images(pdf_bytes: bytes) -> List[Image.Image]:
    """Render each PDF page to a PIL Image using PyMuPDF at high DPI,
    then run each page through the enhancement pipeline."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        for page_idx, page in enumerate(doc):
            mat = fitz.Matrix(_PDF_SCALE_FACTOR, _PDF_SCALE_FACTOR)
            pix = page.get_pixmap(matrix=mat)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Run enhancement pipeline on rendered page
            enhanced = _enhance_pil_image(img)
            images.append(enhanced)
            logger.debug(f"PDF page {page_idx + 1}: rendered & enhanced "
                         f"({pix.width}x{pix.height})")

        doc.close()
        logger.info(f"PDF rendered to {len(images)} enhanced page(s)")
        return images if images else [Image.new("RGB", (800, 600), "white")]

    except Exception as e:
        logger.error(f"PDF rendering failed: {e}")
        return [Image.new("RGB", (800, 600), "white")]


# ══════════════════════════════════════════════════════════════════
# IMAGE PREPROCESSING (main entry for uploaded images)
# ══════════════════════════════════════════════════════════════════

def _preprocess_image(img_bytes: bytes) -> Image.Image:
    """Full enhancement pipeline for an uploaded image file."""
    try:
        pil_img = Image.open(io.BytesIO(img_bytes))

        # Step 1: Fix EXIF orientation before any processing
        pil_img = _fix_exif_orientation(pil_img)
        pil_img = pil_img.convert("RGB")

        return _enhance_pil_image(pil_img)

    except Exception as e:
        logger.warning(f"Image preprocessing failed, using original: {e}")
        return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def _enhance_pil_image(pil_img: Image.Image) -> Image.Image:
    """Apply the full enhancement pipeline to a PIL Image.
    Used for both direct image uploads and rendered PDF pages."""
    try:
        arr = np.array(pil_img)
        bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

        # Stage 2: Deskew
        bgr = _deskew(bgr)

        # Stage 3: Upscale low-resolution images
        bgr = _upscale_if_needed(bgr)

        # Stage 4: Color-preserving denoising
        bgr = _denoise_color(bgr)

        # Stage 5: CLAHE contrast enhancement
        bgr = _apply_clahe(bgr)

        # Stage 6: Sharpen
        bgr = _sharpen(bgr)

        # Convert back to RGB PIL
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)

    except Exception as e:
        logger.warning(f"Enhancement pipeline failed, returning original: {e}")
        return pil_img


# ══════════════════════════════════════════════════════════════════
# PIPELINE STAGES
# ══════════════════════════════════════════════════════════════════

def _fix_exif_orientation(img: Image.Image) -> Image.Image:
    """Read EXIF orientation tag and rotate/flip the image accordingly.
    Mobile phone cameras frequently embed orientation in EXIF rather
    than actually rotating the pixel data."""
    try:
        exif = img.getexif()
        if not exif:
            return img

        # Find orientation tag
        orientation_key = None
        for tag_id, tag_name in ExifTags.TAGS.items():
            if tag_name == "Orientation":
                orientation_key = tag_id
                break

        if orientation_key is None or orientation_key not in exif:
            return img

        orientation = exif[orientation_key]

        transforms = {
            2: [Image.FLIP_LEFT_RIGHT],
            3: [Image.ROTATE_180],
            4: [Image.FLIP_TOP_BOTTOM],
            5: [Image.FLIP_LEFT_RIGHT, Image.ROTATE_90],
            6: [Image.ROTATE_270],
            7: [Image.FLIP_LEFT_RIGHT, Image.ROTATE_270],
            8: [Image.ROTATE_90],
        }

        if orientation in transforms:
            for op in transforms[orientation]:
                img = img.transpose(op)
            logger.debug(f"Applied EXIF orientation correction: {orientation}")

        return img

    except Exception as e:
        logger.debug(f"EXIF orientation read failed (non-critical): {e}")
        return img


def _deskew(bgr: np.ndarray) -> np.ndarray:
    """Detect skew angle from text line orientation and correct it.
    Uses Canny edge detection + HoughLinesP to estimate dominant text angle."""
    try:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines
        lines = cv2.HoughLinesP(
            edges, 1, np.pi / 180,
            threshold=100,
            minLineLength=gray.shape[1] // 8,
            maxLineGap=10
        )

        if lines is None or len(lines) == 0:
            return bgr

        # Calculate angles of all detected lines
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            dx = x2 - x1
            dy = y2 - y1
            if abs(dx) < 1:
                continue
            angle = math.degrees(math.atan2(dy, dx))
            # Only consider near-horizontal lines (text lines)
            if abs(angle) < _MAX_SKEW_ANGLE:
                angles.append(angle)

        if not angles:
            return bgr

        # Median angle is more robust than mean against outliers
        median_angle = float(np.median(angles))

        # Only deskew if the angle is meaningful (> 0.5°)
        if abs(median_angle) < 0.5:
            return bgr

        logger.debug(f"Detected skew angle: {median_angle:.2f}°, correcting...")

        h, w = bgr.shape[:2]
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)

        # Calculate new bounding dimensions to avoid cropping
        cos_val = abs(rotation_matrix[0, 0])
        sin_val = abs(rotation_matrix[0, 1])
        new_w = int(h * sin_val + w * cos_val)
        new_h = int(h * cos_val + w * sin_val)
        rotation_matrix[0, 2] += (new_w - w) / 2
        rotation_matrix[1, 2] += (new_h - h) / 2

        rotated = cv2.warpAffine(
            bgr, rotation_matrix, (new_w, new_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )

        return rotated

    except Exception as e:
        logger.debug(f"Deskew failed (non-critical): {e}")
        return bgr


def _upscale_if_needed(bgr: np.ndarray) -> np.ndarray:
    """Upscale images where the shortest side is below the minimum threshold.
    Low-resolution images produce poor OCR results."""
    h, w = bgr.shape[:2]
    shortest = min(h, w)

    if shortest >= _MIN_DIMENSION:
        return bgr

    scale = _UPSCALE_TARGET / shortest
    new_w = int(w * scale)
    new_h = int(h * scale)

    logger.debug(f"Upscaling image from {w}x{h} to {new_w}x{new_h} "
                 f"(scale={scale:.2f}x)")

    return cv2.resize(bgr, (new_w, new_h), interpolation=cv2.INTER_CUBIC)


def _denoise_color(bgr: np.ndarray) -> np.ndarray:
    """Apply color-preserving denoising.
    Unlike fastNlMeansDenoising (grayscale), this preserves color information
    which EasyOCR uses for better text detection."""
    try:
        return cv2.fastNlMeansDenoisingColored(
            bgr,
            h=_DENOISE_H_LUMINANCE,
            hColor=_DENOISE_H_COLOR,
            templateWindowSize=7,
            searchWindowSize=21
        )
    except Exception as e:
        logger.debug(f"Color denoising failed (non-critical): {e}")
        return bgr


def _apply_clahe(bgr: np.ndarray) -> np.ndarray:
    """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    to the L-channel in LAB color space.
    This enhances local contrast without affecting color balance,
    making faded text more readable."""
    try:
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        clahe = cv2.createCLAHE(
            clipLimit=_CLAHE_CLIP_LIMIT,
            tileGridSize=_CLAHE_TILE_SIZE
        )
        enhanced_l = clahe.apply(l_channel)

        merged = cv2.merge([enhanced_l, a_channel, b_channel])
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

    except Exception as e:
        logger.debug(f"CLAHE failed (non-critical): {e}")
        return bgr


def _sharpen(bgr: np.ndarray) -> np.ndarray:
    """Apply unsharp mask sharpening to improve text edge definition.
    Uses Gaussian blur subtraction method for controlled sharpening."""
    try:
        # Gaussian blur
        blurred = cv2.GaussianBlur(bgr, (0, 0), sigmaX=3)

        # Unsharp mask: original + (original - blurred) * amount
        # amount = 1.5 gives moderate sharpening
        sharpened = cv2.addWeighted(bgr, 1.5, blurred, -0.5, 0)

        return sharpened

    except Exception as e:
        logger.debug(f"Sharpening failed (non-critical): {e}")
        return bgr
