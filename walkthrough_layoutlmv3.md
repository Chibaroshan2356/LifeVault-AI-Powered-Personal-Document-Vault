# Walkthrough: LayoutLMv3 Feasibility Integration (Phase 0)

This document contains the evaluation, architecture design, installation steps, and feasibility results of integrating **LayoutLMv3** into the LifeVault AI service. All testing was completed on CPU in the local workspace.

---

## 1. Installation Steps & Dependencies
To configure LayoutLMv3 in the project, the following dependencies were added to `requirements.txt` and installed:

- **`transformers==4.40.0`**: Provides the LayoutLMv3 architecture, tokenizer (`LayoutLMv3TokenizerFast`), and model loader (`LayoutLMv3ForTokenClassification`).
- **`psutil==5.9.8`**: Used to monitor real-time system performance (RAM and CPU usage).
- **`sentencepiece==0.2.0`**: Required for tokenization dependencies in Hugging Face.

### Setup Instructions
1. Run pip install for the new requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Verify that PyTorch (`torch`) and `torchvision` are already installed (the environment uses `torch 2.12.1+cpu` and `torchvision 0.27.1`).

---

## 2. Architecture & Design
The integration is built as a completely isolated module within `app/layoutlm/`:

```
ai-service/app/layoutlm/
├── __init__.py      # Module entry point
├── service.py       # LayoutLMv3Service (Model loading, box normalization, and CPU inference)
├── router.py        # FastAPI endpoints (POST /layoutlm/predict)
└── benchmark.py     # Standalone CLI evaluation script
```

### Components
1. **`LayoutLMv3Service`** (`service.py`):
   - Initializes the processor with `apply_ocr=False` so that custom external OCR outputs can be directly injected.
   - Normalizes raw OCR bounding boxes `[x0, y0, x1, y1]` into the 1000-scale coordinates (`0-1000`) required by LayoutLMv3.
   - Executes the token classification model on CPU and measures load and inference resource metrics.
2. **`layoutlm_router`** (`router.py`):
   - Exposes `POST /layoutlm/predict` accepting:
     - `file`: Scanned document image
     - `ocr_text`: JSON string of tokenized words
     - `ocr_bboxes`: JSON string of tokenized bounding boxes
3. **`benchmark.py`**:
   - Programmatically loads the first page of `datasets/test_document.pdf` (rendered via PyMuPDF).
   - Extracts OCR text boxes using the existing `EasyOCR` library.
   - Formats the input for LayoutLMv3, runs inference, and prints resource consumption stats.

---

## 3. Feasibility & Measurement Results
The benchmark script was executed on CPU to obtain the baseline performance metrics of the model (`nielsr/layoutlmv3-finetuned-funsd`):

| Metric | Cold Run (First download) | Warm Run (Cached) |
| :--- | :--- | :--- |
| **Model Loading Time** | `459.826` seconds (includes network download) | **`5.899` seconds** |
| **Model Loading RAM Delta**| — | **`105.00` MB** |
| **Model Loading CPU Time** | — | **`8.28` seconds** |
| **Inference Execution Time**| — | **`0.793` seconds** (for 44 tokens) |
| **Inference RAM Delta** | — | **`126.91` MB** |
| **Inference CPU Time** | — | **`9.06` seconds** |
| **Peak Process RAM Footprint**| — | **`2469.58` MB** (Total RSS, includes EasyOCR + PyTorch) |

### Feasibility Takeaways
- **Inference Speed:** An inference time of `< 0.8 seconds` on a standard CPU is highly acceptable for offline document batch processing or backend queue workers.
- **Memory Footprint:** The standalone RAM added by LayoutLMv3 is extremely low (`~105 MB` for loading, `~127 MB` during inference). The peak memory is high (`~2.4 GB`) primarily because PyTorch and EasyOCR reader weights are resident in the same process memory space.
- **CPU Bound:** Since we are running on CPU, the CPU time is identical to active computation time. Threading configurations or batching can be optimized if throughput demands increase.

---

## 4. Expected Integration Points
Once layout understanding is moved to production in future phases, the following integration paths are recommended:

1. **OCR Output Sharing:**
   - Instead of running EasyOCR twice, rewrite `ai-service/app/routers/process.py` to extract both text and layout bounding boxes in a single pass.
   - EasyOCR's `readtext` results (which yield bounding boxes natively) should be stored in the primary pipeline response context.
2. **Metadata Extraction Refinement:**
   - Instead of relying purely on regex and keyword matches (e.g. searching for adjacent words to find names, amounts, or dates), we can query LayoutLMv3 classification labels.
   - For example, tokens classified as `B-QUESTION` / `I-QUESTION` and `B-ANSWER` / `I-ANSWER` can serve as structured key-value pairs to refine entity extraction.
3. **Lazy Loading:**
   - Keep the model lazy-loaded on-demand or preloaded in a background thread to prevent blocking FastAPI startup.

---

## 5. Verification Status
- **FastAPI Startup:** FastAPI booted successfully on port `8008` (and would bind to `8000` if free) with no errors.
- **API Documentation:** The OpenAPI endpoint documentation displays the new `/layoutlm/predict` routes properly.
- **Existing Pipelines:** All existing OCR, classification, and metadata extraction tests pass successfully without modifications (`14 tests passed in 0.16s`).
