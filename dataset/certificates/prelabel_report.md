# Certificate Dataset Pre-label Report

> Generated: 2026-07-04 15:03:12
> Tool: `tools/prepare_dataset.py`

---

## Summary

| Metric | Value |
|--------|-------|
| Total Certificates Processed | 21/21 |
| Total OCR Tokens | 560 |
| Auto-labelled Entities (non-O) | 130 (23.2%) |
| Remaining O Tokens | 430 (76.8%) |

> [!NOTE]
> A high proportion of `O` tokens is normal at this stage.
> The pre-labeler prioritizes precision. Manual review is required
> to complete ground-truth annotations before training.

---

## Entity Label Frequency

| Label | Count |
|-------|-------|
| `O` | 430 |
| `I-DOCUMENT_TITLE` | 47 |
| `B-DOCUMENT_TITLE` | 22 |
| `B-HOLDER_NAME` | 18 |
| `I-HOLDER_NAME` | 17 |
| `I-ORGANIZATION` | 10 |
| `B-ISSUE_DATE` | 9 |
| `B-ORGANIZATION` | 7 |

---

## Per-Document Summary

| File | Tokens | Entities | O Tokens | OCR Method | Status |
|------|--------|----------|----------|------------|--------|
| `certificate_001.pdf` | 13 | 0 | 13 | pymupdf | OK |
| `certificate_002.png` | 10 | 5 | 5 | easyocr | OK |
| `certificate_003.pdf` | 24 | 8 | 16 | pymupdf | OK |
| `certificate_004.pdf` | 126 | 30 | 96 | pymupdf | OK |
| `certificate_005.pdf` | 22 | 5 | 17 | pymupdf | OK |
| `certificate_006.pdf` | 51 | 5 | 46 | pymupdf | OK |
| `certificate_007.pdf` | 28 | 0 | 28 | pymupdf | OK |
| `certificate_008.pdf` | 18 | 8 | 10 | pymupdf | OK |
| `certificate_009.pdf` | 28 | 10 | 18 | pymupdf | OK |
| `certificate_010.pdf` | 20 | 4 | 16 | pymupdf | OK |
| `certificate_011.pdf` | 48 | 12 | 36 | pymupdf | OK |
| `certificate_012.pdf` | 16 | 0 | 16 | pymupdf | OK |
| `certificate_013.pdf` | 15 | 5 | 10 | pymupdf | OK |
| `certificate_014.png` | 16 | 7 | 9 | easyocr | OK |
| `certificate_015.pdf` | 37 | 5 | 32 | pymupdf | OK |
| `certificate_016.png` | 9 | 5 | 4 | easyocr | OK |
| `certificate_017.jpeg` | 10 | 8 | 2 | easyocr | OK |
| `certificate_018.pdf` | 22 | 2 | 20 | pymupdf | OK |
| `certificate_019.jpeg` | 12 | 3 | 9 | easyocr | OK |
| `certificate_020.jpeg` | 20 | 1 | 19 | easyocr | OK |
| `certificate_021.pdf` | 15 | 7 | 8 | pymupdf | OK |

---

## Validation

Run the dataset validator to confirm all JSONs pass schema checks:

```powershell
python training/validate_dataset.py
```

---

## Next Steps

1. Review pre-labeled JSONs in `dataset/certificate/labels/` manually.
2. Correct mis-labeled or missed entities.
3. Run `python training/validate_dataset.py` to confirm 0 errors.
4. Once ground-truth annotations are complete, proceed to Colab training.