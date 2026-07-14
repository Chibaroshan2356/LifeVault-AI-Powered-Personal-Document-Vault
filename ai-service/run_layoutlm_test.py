"""
ai-service/run_layoutlm_test.py
==============================
Standalone test script to run a sample document through the LayoutLMv3 inference pipeline.
Does not use FastAPI; directly imports and calls pipeline components.
"""

import os
import sys
import argparse
from PIL import Image

# Ensure the parent directory is in the path so we can resolve app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.preprocessing.processor import preprocess
from app.ocr.extractor import extract_text_from_images
from app.extraction.extractor import extract, _normalise_date
from app.services.layoutlm_inference import layoutlm_inference_service

def main():
    parser = argparse.ArgumentParser(description="Run a standalone LayoutLMv3 pipeline test on a document.")
    parser.add_argument(
        "--image", 
        type=str, 
        default=r"D:\LifeVault AI\kiro\LifeVault\dataset\pan\raw\pan1.png",
        help="Path to the document image."
    )
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"ERROR: Image file does not exist at {args.image}")
        sys.exit(1)

    print(f"Step 1: Reading and preprocessing image: {args.image}")
    with open(args.image, "rb") as f:
        file_bytes = f.read()
    
    # We assume image file type. Determine extension to set mime-type
    ext = os.path.splitext(args.image)[1].lower()
    mime_type = "image/png" if ext == ".png" else "image/jpeg"
    
    images = preprocess(file_bytes, mime_type)
    if not images:
        print("ERROR: Preprocessor did not return any images.")
        sys.exit(1)
        
    print(f"Successfully preprocessed {len(images)} page(s). Shortest dimension check: {images[0].size}")

    print("\nStep 2: Running OCR to extract text and bounding boxes...")
    ocr_text, ocr_conf, words_with_boxes = extract_text_from_images(images)
    print(f"OCR Complete. Mean confidence: {ocr_conf:.2%}")
    print(f"Total OCR tokens: {len(words_with_boxes)}")
    print(f"Preview OCR text (first 100 chars):\n{ocr_text[:100]}...")

    print("\nStep 3: Running local LayoutLMv3 model predictions...")
    first_page_words = [wb for wb in words_with_boxes if wb.get("page") == 0]
    words_list = [wb["text"] for wb in first_page_words]
    boxes_list = [wb["box"] for wb in first_page_words]
    
    layoutlm_results = layoutlm_inference_service.predict(
        images[0], words_list, boxes_list
    )
    
    print("\nLayoutLMv3 Raw Extracted Entities:")
    for field, data in layoutlm_results.items():
        print(f"  - {field}: '{data['value']}' (Confidence: {data['confidence']:.2%})")

    print("\nStep 4: Running rule-based baseline extraction...")
    rule_based_results = extract(ocr_text)
    print("Rule-Based baseline results:")
    for field, val in rule_based_results.items():
         print(f"  - {field}: '{val}'")

    print("\nStep 5: Applying confidence-based fallback merge (threshold = 70%)...")
    final_extracted = {}
    for field in ["documentName", "holderName", "organization", "documentNumber", "issueDate", "expiryDate"]:
        llm_ent = layoutlm_results.get(field)
        if llm_ent and llm_ent["confidence"] >= 0.70:
            val = llm_ent["value"]
            if field in ["issueDate", "expiryDate"]:
                val = _normalise_date(val)
            final_extracted[field] = val
            print(f"  - {field:16}: '{val}' [LayoutLMv3 - Conf: {llm_ent['confidence']:.2%}]")
        else:
            final_extracted[field] = rule_based_results.get(field)
            src = "below threshold" if llm_ent else "missing prediction"
            print(f"  - {field:16}: '{final_extracted[field]}' [Fallback: Rule-Based ({src})]")

    # Print model metrics
    metrics = layoutlm_inference_service.loading_metrics
    print("\nModel Loading Metrics:")
    for k, v in metrics.items():
        print(f"  - {k}: {v}")

if __name__ == "__main__":
    main()
