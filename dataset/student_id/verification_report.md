# Student ID Dataset Verification Report

## 1. Goal & Dataset Details
This report documents the verification of the Student ID card dataset prepared for LayoutLMv3 training.
*   **Total Source Cards Available:** 471 files (Kaggle/Roboflow export)
*   **Target Sample Count:** exactly 100 randomly sampled files
*   **Renaming Convention:** `student_id_001.jpg` to `student_id_100.jpg`
*   **Manifest Path:** `dataset/student_id/selected_files.csv`
*   **Report Path:** `dataset/student_id/prelabel_report.md`

---

## 2. Shared Framework Reuse
All generic dataset preparation components were reused successfully without any code duplication:
- `tools/prepare_dataset.py` (Main CLI controller)
- `tools/ocr_pipeline.py` (Unified PyMuPDF and EasyOCR pipeline)
- `tools/annotation_writer.py` (CSV manifest & JSON output serialisation)
- `training/validate_dataset.py` (Dataset validator)

Only the student ID custom prelabeler plugin `tools/prelabel/student_id.py` was created to implement heuristics for Student IDs.

---

## 3. Spot-Check Verification (10 Random Files)
The spot-check run verified 10 randomly selected Student ID annotations:

### File-by-File Verification Results

| File | Holder Name | Organization | Card Title | Issue/Expiry Date | Notes |
|:---|:---:|:---:|:---:|:---:|:---|
| `student_id_007.json` | ✅ | — | — | ✅ | Found `08/31/2026` as `B-EXPIRY_DATE` (from `EXPIRES:` context). |
| `student_id_015.json` | — | — | — | — | Crop containing low-quality text fragments ("1", "Il", "VJ"). |
| `student_id_028.json` | ✅ | — | — | — | Correctly pre-labeled student's name in fallback zone. |
| `student_id_029.json` | ✅ | — | — | — | Correctly pre-labeled student's name. |
| `student_id_034.json` | ✅ | — | — | — | Correctly pre-labeled student's name. |
| `student_id_045.json` | — | — | — | — | Low-quality crop containing numeric codes and noise. |
| `student_id_062.json` | ✅ | — | ✅ | — | Pre-labeled holder name & card title ("Identity Card"). |
| `student_id_066.json` | ✅ | — | — | — | Correctly pre-labeled holder name. |
| `student_id_087.json` | ✅ | — | ✅ | — | Pre-labeled holder name & card title ("Identity Card"). |
| `student_id_093.json` | — | — | — | — | Crop with blurred OCR text. |

### Verification Summary
*   **Holder Name Detection:** 70% (7/10)
*   **Organization Detection:** 0% (0/10) - Low because the Roboflow dataset is tightly cropped and lacks visible university banners/logos, or uses generic abbreviation text like "VJ".
*   **Card Title Detection:** 20% (2/10) - Matches when keywords like "Identity Card" are parsed.
*   **Issue/Expiry Date Detection:** 10% (1/10) - Correctly detects expiry dates following trigger contexts.

---

## 4. Dataset Validation Output
Running the final validation tool over the entire dataset confirms zero errors:
```powershell
python training/validate_dataset.py
```
**Results:**
- `100/100` student ID files: **Valid (0 errors, 0 warnings)**
- Total dataset files (Resumes + Certificates + Student IDs + Samples): **181/181 files valid**
- **Dataset Readiness: 100.0%**
