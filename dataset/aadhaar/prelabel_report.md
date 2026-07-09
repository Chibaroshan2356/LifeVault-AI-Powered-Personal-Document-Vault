# Aadhaar Card Dataset Pre-label Report

> Generated: 2026-07-09 10:19:50
> Tool: `tools/prepare_dataset.py`

---

## Summary

| Metric | Value |
|--------|-------|
| Total Aadhaar Cards Processed | 21/21 |
| Total OCR Tokens | 479 |
| Auto-labelled Entities (non-O) | 116 (24.2%) |
| Remaining O Tokens | 363 (75.8%) |

> [!NOTE]
> A high proportion of `O` tokens is normal at this stage.
> The pre-labeler prioritizes precision. Manual review is required
> to complete ground-truth annotations before training.

---

## Entity Label Frequency

| Label | Count |
|-------|-------|
| `O` | 363 |
| `B-DOCUMENT_TITLE` | 25 |
| `I-ADDRESS` | 25 |
| `B-DOCUMENT_NUMBER` | 21 |
| `B-HOLDER_NAME` | 16 |
| `I-DOCUMENT_NUMBER` | 8 |
| `B-GENDER` | 7 |
| `B-ADDRESS` | 7 |
| `B-DATE_OF_BIRTH` | 3 |
| `I-HOLDER_NAME` | 3 |
| `I-DOCUMENT_TITLE` | 1 |

---

## Per-Document Summary

| File | Tokens | Entities | O Tokens | OCR Method | Status |
|------|--------|----------|----------|------------|--------|
| `aadhaar_001.jpeg` | 18 | 5 | 13 | easyocr | OK |
| `aadhaar_002.jpg` | 40 | 9 | 31 | easyocr | OK |
| `aadhaar_003.jpeg` | 22 | 3 | 19 | easyocr | OK |
| `aadhaar_004.jpeg` | 5 | 4 | 1 | easyocr | OK |
| `aadhaar_005.jpeg` | 26 | 1 | 25 | easyocr | OK |
| `aadhaar_006.jpeg` | 19 | 3 | 16 | easyocr | OK |
| `aadhaar_007.jpeg` | 19 | 7 | 12 | easyocr | OK |
| `aadhaar_008.jpeg` | 17 | 3 | 14 | easyocr | OK |
| `aadhaar_009.jpg` | 41 | 14 | 27 | easyocr | OK |
| `aadhaar_010.jpeg` | 15 | 4 | 11 | easyocr | OK |
| `aadhaar_011.jpeg` | 40 | 6 | 34 | easyocr | OK |
| `aadhaar_012.jpeg` | 19 | 3 | 16 | easyocr | OK |
| `aadhaar_013.jpeg` | 34 | 9 | 25 | easyocr | OK |
| `aadhaar_014.jpeg` | 37 | 8 | 29 | easyocr | OK |
| `aadhaar_015.jpg` | 16 | 4 | 12 | easyocr | OK |
| `aadhaar_016.jpeg` | 9 | 2 | 7 | easyocr | OK |
| `aadhaar_017.jpeg` | 22 | 6 | 16 | easyocr | OK |
| `aadhaar_018.jpeg` | 6 | 5 | 1 | easyocr | OK |
| `aadhaar_019.jpeg` | 23 | 9 | 14 | easyocr | OK |
| `aadhaar_020.jpeg` | 13 | 7 | 6 | easyocr | OK |
| `aadhaar_021.jpeg` | 38 | 4 | 34 | easyocr | OK |

---

## Validation

Run the dataset validator to confirm all JSONs pass schema checks:

```powershell
python training/validate_dataset.py
```

---

## Next Steps

1. Review pre-labeled JSONs in `dataset/aadhaar card/labels/` manually.
2. Correct mis-labeled or missed entities.
3. Run `python training/validate_dataset.py` to confirm 0 errors.
4. Once ground-truth annotations are complete, proceed to Colab training.