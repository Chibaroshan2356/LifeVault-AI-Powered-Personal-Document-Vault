"""FastAPI router for isolated LayoutLMv3 feasibility evaluation."""
import io
import json
import logging
from PIL import Image
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from app.layoutlm.service import layoutlm_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict")
async def predict_layoutlm(
    file: UploadFile = File(...),
    ocr_text: str = Form(..., description="JSON-serialized List[str] of extracted words"),
    ocr_bboxes: str = Form(..., description="JSON-serialized List[List[int]] of bounding boxes in format [x0, y0, x1, y1]"),
):
    """
    Feasibility endpoint to run LayoutLMv3 inference on an uploaded image, 
    with custom OCR text and bounding boxes.
    """
    try:
        # Read file bytes
        file_bytes = await file.read()
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

    try:
        words = json.loads(ocr_text)
        if not isinstance(words, list):
            raise ValueError("ocr_text must be a JSON array of strings")
        # Ensure all elements are strings
        words = [str(w) for w in words]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ocr_text JSON format. Expected list of strings: {e}")

    try:
        boxes = json.loads(ocr_bboxes)
        if not isinstance(boxes, list):
            raise ValueError("ocr_bboxes must be a JSON array of lists")
        cleaned_boxes = []
        for box in boxes:
            if not isinstance(box, list) or len(box) != 4:
                raise ValueError("Each bounding box must be a list of 4 integers: [x0, y0, x1, y1]")
            cleaned_boxes.append([int(coord) for coord in box])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ocr_bboxes JSON format. Expected list of 4-element lists: {e}")

    if len(words) != len(cleaned_boxes):
        raise HTTPException(
            status_code=400,
            detail=f"Length mismatch: ocr_text has {len(words)} elements, but ocr_bboxes has {len(cleaned_boxes)} elements."
        )

    try:
        # Run inference using service (which also measures system performance)
        result = layoutlm_service.run_inference(image, words, cleaned_boxes)
        return result
    except Exception as e:
        logger.error(f"LayoutLMv3 prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LayoutLMv3 inference failed: {str(e)}")
