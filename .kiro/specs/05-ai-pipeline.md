# AI Pipeline Design
## LifeVault — Document Intelligence Pipeline
**Version:** 1.0

---

## 1. Pipeline Overview

**Key design decision: Extraction runs BEFORE Classification.**
After OCR, we first identify structured fields (name, dates, document number).
The classifier then receives both raw text AND extracted fields — much richer
signal than raw OCR text alone.

```
Upload
  │
  ▼
┌─────────────────┐
│  Preprocessing  │  Validate → PDF→image → Deskew → Denoise
│  app/preprocessing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      OCR        │  DocTR text detection + recognition
│  app/ocr        │  Returns: full_text, word_bboxes, confidence
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Extraction    │  Named entity extraction — runs BEFORE classification
│  app/extraction │  Returns: holder_name, doc_number, issue_date, expiry_date
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Classification  │  Uses OCR text + extracted fields for richer signal
│  app/classification  Returns: document_type, confidence
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Metadata     │  Assemble DocumentMetadata, normalize dates → ISO 8601
│  app/metadata   │
└────────┬────────┘
         │
         ▼
    JSON Response
    (sent back to Express backend)
```

---

## 2. Stage 1 — Preprocessing (`app/preprocessing`)

**Input:** Raw uploaded file (PDF or image)

**Steps:**
1. Validate MIME type and file size
2. If PDF: convert pages to images using `pdf2image`
3. Resize to minimum 300 DPI for OCR accuracy
4. Deskew using OpenCV Hough line transform
5. Denoise using Gaussian blur + adaptive thresholding
6. Normalize pixel values

**Output:** List of preprocessed PIL Images

**Key libraries:** `opencv-python`, `Pillow`, `pdf2image`

---

## 3. Stage 2 — OCR (`app/ocr`)

**Input:** List of preprocessed images

**Steps:**
1. Load DocTR model (`db_resnet50` for detection, `crnn_vgg16_bn` for recognition)
2. Run inference on each page
3. Concatenate extracted text across pages
4. Compute mean confidence score

**Output:**
```python
{
  "text": "Government of India\nAadhaar Card\n...",
  "confidence": 0.94,
  "page_count": 1
}
```

**Key libraries:** `python-doctr[torch]`

**GPU note:** `USE_GPU=true` in `.env` enables CUDA acceleration. Default is CPU.

---

## 4. Stage 3 — Classification (`app/classification`)

**Input:** Extracted OCR text

**Phase 1 (rule-based):**

| Keyword patterns | → Document Type |
|-----------------|----------------|
| "aadhaar", "uid", "1234 5678" | Aadhaar Card |
| "permanent account number", "pan" | PAN Card |
| "passport no", "republic of india" | Passport |
| "driving licence", "transport" | Driving License |
| "voter", "election commission" | Voter ID |
| "degree", "bachelor", "university" | Degree Certificate |
| "marksheet", "result", "grade" | Marksheet |
| "account statement", "balance" | Bank Statement |

**Phase 2 (ML-based, future):** Fine-tuned text classifier on labeled document corpus.

**Output:** `{ "document_type": "Aadhaar Card", "confidence": 0.92 }`

---

## 5. Stage 4 — Extraction (`app/extraction`)

**Input:** OCR text + document type

**Method:** Regex patterns tailored per document type

**Extracted fields:**

| Field | Example regex |
|-------|---------------|
| Holder name | Line after "Name:" or before DOB |
| Document number | `\d{4}\s\d{4}\s\d{4}` (Aadhaar) |
| Issue date | `\d{2}/\d{2}/\d{4}` |
| Expiry date | `valid until`, `expiry` keyword |
| Organization | Line after "Issued by" |

**Future:** LayoutLMv3 for layout-aware extraction using bounding boxes.

---

## 6. Stage 5 — Metadata Assembly (`app/metadata`)

**Input:** Extracted raw fields dict

**Steps:**
1. Normalize date strings to Python `datetime` objects → ISO 8601
2. Capitalize names
3. Strip whitespace and artifacts
4. Assemble `DocumentMetadata` Pydantic schema

**Output:**
```json
{
  "holder_name": "John Doe",
  "document_number": "1234 5678 9012",
  "document_name": "Aadhaar Card",
  "organization": "Government of India",
  "issue_date": null,
  "expiry_date": null
}
```

---

## 7. Error Handling

| Stage | Error | Response |
|-------|-------|----------|
| Preprocessing | Unsupported file type | HTTP 415 |
| Preprocessing | File too large | HTTP 413 |
| OCR | Model load failure | HTTP 500 + error message |
| OCR | Low confidence (<0.4) | Returns text with warning flag |
| Classification | No matching keywords | Returns "Other" with low confidence |
| Extraction | No fields matched | Returns empty metadata (not an error) |

---

## 8. API Endpoints (FastAPI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| POST | `/ocr/extract` | OCR only |
| POST | `/classify` | Classification only |
| POST | `/extract` | Metadata extraction only |
| POST | `/process` | **Full pipeline** (used by backend) |
