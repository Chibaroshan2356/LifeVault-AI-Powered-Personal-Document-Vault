# LifeVault Dataset Documentation

This directory contains the dataset structure, metadata schemas, and annotation guidelines for training a **LayoutLMv3** model for key-value extraction and document layout understanding in LifeVault.

---

## 1. Directory Structure
The dataset is structured as follows, with 10 document categories. Each category contains an `images` folder (for source pages) and a `labels` folder (for JSON annotations):

```
dataset/
├── schema.json          # Unified validation schema for document metadata
├── README.md            # Dataset documentation (this file)
├── resume/
│   ├── images/          # Resumes in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── passport/
│   ├── images/          # Passports in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── pan/
│   ├── images/          # PAN Cards in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── aadhaar/
│   ├── images/          # Aadhaar Cards in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── student_id/
│   ├── images/          # Student IDs in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── certificates/
│   ├── images/          # Educational Certificates in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── internship/
│   ├── images/          # Internship Certificates in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── fee_receipts/
│   ├── images/          # Fee Receipts in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
├── medical/
│   ├── images/          # Medical Records in PNG/JPG format
│   └── labels/          # FUNSD-compatible annotation JSONs
└── insurance/
    ├── images/          # Insurance Policies in PNG/JPG format
    └── labels/          # FUNSD-compatible annotation JSONs
```

---

## 2. Selected Annotation Format
We use a **FUNSD-compatible spatial token classification format** extended with document-level ground truth metadata. 

### Why this format was selected:
1. **LayoutLMv3 Compatibility:** LayoutLMv3 in Hugging Face natively expects a sequence of text tokens, their bounding boxes normalized to a `0-1000` scale, and token-level class labels (e.g. BIO tags).
2. **Key-Value Extraction Mapping:** Each word token is labeled with a specific Entity Class (e.g., `B-HOLDER_NAME`, `I-HOLDER_NAME`, `B-PAN_NUMBER`) or `O` (Outside). This allows LayoutLMv3 to perform Named Entity Recognition (NER) on spatial layout data.
3. **Structured Verification:** By appending `document_metadata` to the top of each JSON, we map spatial annotations directly to target database schemas, simplifying downstream validation and pipeline evaluation.

### Example Label Structure:
```json
{
  "document_metadata": {
    "category": "PAN Card",
    "holder_name": "JOHN DOE",
    "pan_number": "ABCDE1234F",
    "date_of_birth": "1990-01-01"
  },
  "image_filename": "pan_001.png",
  "image_dimensions": [600, 400],
  "words": [
    { "text": "PAN:", "box": [30, 70, 70, 85], "label": "O" },
    { "text": "ABCDE1234F", "box": [80, 70, 200, 85], "label": "B-PAN_NUMBER" },
    { "text": "JOHN", "box": [80, 110, 130, 125], "label": "B-HOLDER_NAME" },
    { "text": "DOE", "box": [140, 110, 180, 125], "label": "I-HOLDER_NAME" }
  ]
}
```

---

## 3. Dataset Naming Convention
To prevent collisions and keep data organized, follow this naming convention:
- **Images:** `<category_code>_<uuid>.<ext>` (e.g., `aadhaar_4d46de6a-d85d-4884-9950.png`)
- **Labels:** `<category_code>_<uuid>.json` (e.g., `aadhaar_4d46de6a-d85d-4884-9950.json`)

**Category Codes:**
- `resume` -> `res`
- `passport` -> `pass`
- `pan` -> `pan`
- `aadhaar` -> `adh`
- `student_id` -> `sid`
- `certificates` -> `cert`
- `internship` -> `int`
- `fee_receipts` -> `fee`
- `medical` -> `med`
- `insurance` -> `ins`

---

## 4. Image, PDF, and OCR Requirements

### Image Requirements
- **Formats:** PNG or JPEG. PNG is preferred to avoid compression artifacts.
- **Color Space:** RGB color space.
- **Resolution:** Minimum resolution of `1000px` on the shortest side to guarantee OCR accuracy.
- **DPI:** Recommend `150 DPI` to `300 DPI` for scanned pages.

### PDF Preprocessing Requirements
Most user uploads in LifeVault are PDF files. Before training or batch inference:
1. **Render Pages:** Render the first page of the PDF to a high-resolution PNG image at a scale factor of `2.5` (approx. `180 DPI` to `200 DPI`) using PyMuPDF (`fitz.Matrix(2.5, 2.5)`).
2. **Contrast Enhancement:** Apply local contrast enhancement (CLAHE) and auto-deskewing as defined in the `app.preprocessing.processor` pipeline to improve visual quality.

### OCR Pretraining Requirements
Before feeding labels to the model, run OCR using **EasyOCR** (the active OCR engine in the LifeVault AI service) to extract:
1. **Tokens:** Raw words (separated by spaces).
2. **Bounding Boxes:** `[x0, y0, x1, y1]` pixel-scale boxes for each word.
3. **Word Alignment:** Assign the target entity tag (e.g. `B-HOLDER_NAME`) to each word using its spatial overlap with the ground truth field coordinates in the document.
