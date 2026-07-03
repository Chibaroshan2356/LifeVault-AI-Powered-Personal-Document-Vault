"""Standalone benchmark script for LayoutLMv3 feasibility evaluation."""
import io
import os
import sys
import json
import time
import logging

# Set up logging to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("LayoutLMv3Benchmark")

# Add the parent folder of 'app' to sys.path to resolve imports correctly
# The script is in ai-service/app/layoutlm/
current_dir = os.path.dirname(os.path.abspath(__file__))
ai_service_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if ai_service_dir not in sys.path:
    sys.path.append(ai_service_dir)

from PIL import Image
import fitz  # PyMuPDF
import easyocr

from app.layoutlm.service import layoutlm_service


def find_dataset_file(filename):
    possible_paths = [
        os.path.join(ai_service_dir, "..", "datasets", filename),
        os.path.join(ai_service_dir, "datasets", filename),
        os.path.join(os.getcwd(), "datasets", filename),
        os.path.join(os.getcwd(), filename)
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None


def get_sample_image():
    """Attempts to load a sample image from the datasets folder, falling back to a synthetic document."""
    # 1. Try test_document.pdf
    pdf_path = find_dataset_file("test_document.pdf")
    if pdf_path:
        logger.info(f"Using PDF sample: {pdf_path}")
        try:
            doc = fitz.open(pdf_path)
            page = doc[0]
            # Render page to image at 150 DPI
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data)).convert("RGB")
            doc.close()
            return img, "PDF Page 1"
        except Exception as e:
            logger.warning(f"Failed to load/render PDF: {e}")

    # 2. Try test_aadhaar.png
    png_path = find_dataset_file("test_aadhaar.png")
    if png_path:
        # Check size to ensure it's not a placeholder
        if os.path.getsize(png_path) > 1024:
            logger.info(f"Using PNG sample: {png_path}")
            try:
                img = Image.open(png_path).convert("RGB")
                return img, "Aadhaar PNG"
            except Exception as e:
                logger.warning(f"Failed to load Aadhaar PNG: {e}")

    # 3. Fallback: Synthetic Invoice image
    logger.info("No valid dataset file found or rendered. Creating synthetic document image...")
    from PIL import ImageDraw
    img = Image.new("RGB", (800, 1000), color="white")
    draw = ImageDraw.Draw(img)
    # Simple lines of text
    draw.text((100, 100), "INVOICE", fill="black")
    draw.text((100, 150), "INVOICE NUMBER: INV-2026-9999", fill="black")
    draw.text((100, 200), "DATE: 2026-07-02", fill="black")
    draw.text((100, 250), "DEVELOPMENT SERVICES: $1500.00", fill="black")
    draw.text((100, 300), "TOTAL DUE: $1500.00", fill="black")
    return img, "Synthetic Invoice"


def run_ocr(image):
    """Runs EasyOCR on the PIL Image to extract word tokens and bounding boxes."""
    logger.info("Initializing EasyOCR reader and running OCR extraction...")
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    
    # Save PIL image to bytes
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    
    start_time = time.time()
    results = reader.readtext(buf.read(), detail=1, paragraph=False)
    elapsed = time.time() - start_time
    logger.info(f"EasyOCR finished in {elapsed:.3f}s. Extracted {len(results)} text blocks.")
    
    words = []
    boxes = []
    
    for (bbox, text, conf) in results:
        if text.strip():
            words.append(text.strip())
            # Convert EasyOCR corners: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
            # to [x_min, y_min, x_max, y_max]
            x_coords = [p[0] for p in bbox]
            y_coords = [p[1] for p in bbox]
            boxes.append([
                int(min(x_coords)),
                int(min(y_coords)),
                int(max(x_coords)),
                int(max(y_coords))
            ])
            
    return words, boxes


def main():
    logger.info("Starting LayoutLMv3 Feasibility Benchmark...")
    
    # Get sample document image
    image, doc_source = get_sample_image()
    logger.info(f"Sample document loaded: {doc_source} (dimensions: {image.width}x{image.height})")
    
    # Extract OCR data
    words, boxes = run_ocr(image)
    if not words:
        # Provide dummy words if OCR returned nothing
        logger.warning("OCR returned no text. Using fallback synthetic words for evaluation.")
        words = ["INVOICE", "INV-2026-9999", "DATE:", "2026-07-02", "TOTAL:", "$1500.00"]
        boxes = [
            [100, 100, 200, 120],
            [100, 150, 300, 170],
            [100, 200, 150, 220],
            [170, 200, 270, 220],
            [100, 300, 150, 320],
            [170, 300, 270, 320]
        ]
        
    logger.info(f"Running inference with {len(words)} tokens...")
    
    # Run LayoutLMv3
    result = layoutlm_service.run_inference(image, words, boxes)
    
    # Output metrics
    print("\n" + "="*50)
    print("           LAYOUTLMV3 BENCHMARK RESULTS           ")
    print("="*50)
    print(f"Sample Source:       {doc_source}")
    print(f"Image Resolution:    {image.width}x{image.height}")
    print(f"Total Words Passed:  {len(words)}")
    print(f"Model Name:          {result['metrics']['loading']['model_name']}")
    print("-"*50)
    print("1. MODEL LOADING METRICS:")
    print(f"   - Loading Time:   {result['metrics']['loading']['load_time_seconds']:.3f} seconds")
    print(f"   - RAM Allocated:  {result['metrics']['loading']['ram_allocated_mb']:.2f} MB")
    print(f"   - Peak RAM Total: {result['metrics']['loading']['ram_total_mb']:.2f} MB")
    print(f"   - CPU Time Used:  {result['metrics']['loading']['cpu_time_seconds']:.2f} seconds")
    print("-"*50)
    print("2. INFERENCE METRICS:")
    print(f"   - Inference Time: {result['metrics']['inference']['inference_time_seconds']:.3f} seconds")
    print(f"   - RAM Allocated:  {result['metrics']['inference']['ram_allocated_mb']:.2f} MB")
    print(f"   - Peak RAM Total: {result['metrics']['inference']['ram_total_mb']:.2f} MB")
    print(f"   - CPU Time Used:  {result['metrics']['inference']['cpu_time_seconds']:.2f} seconds")
    print("-"*50)
    print("3. SAMPLE TOKEN CLASSIFICATION PREDICTIONS:")
    # Print the first 15 predicted tokens/labels
    tokens = result["tokens"]
    labels = result["predicted_labels"]
    print("   First 15 tokens mapped to LayoutLMv3 predictions:")
    limit = min(15, len(tokens))
    for idx in range(limit):
        token_str = tokens[idx].encode("ascii", errors="backslashreplace").decode("ascii")
        print(f"   - Token {idx+1:02d}: '{token_str}' => Label: {labels[idx]}")

    print("="*50 + "\n")


if __name__ == "__main__":
    main()
