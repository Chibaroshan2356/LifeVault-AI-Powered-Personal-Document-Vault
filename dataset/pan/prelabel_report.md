# PAN Card Dataset Pre-label Report

> Generated: 2026-07-09 10:10:41
> Tool: `tools/prepare_dataset.py`

---

## Summary

| Metric | Value |
|--------|-------|
| Total PAN Cards Processed | 6/6 |
| Total OCR Tokens | 104 |
| Auto-labelled Entities (non-O) | 43 (41.3%) |
| Remaining O Tokens | 61 (58.7%) |

> [!NOTE]
> A high proportion of `O` tokens is normal at this stage.
> The pre-labeler prioritizes precision. Manual review is required
> to complete ground-truth annotations before training.

---

## Entity Label Frequency

| Label | Count |
|-------|-------|
| `O` | 61 |
| `B-DOCUMENT_TITLE` | 12 |
| `B-DOCUMENT_NUMBER` | 7 |
| `I-DOCUMENT_TITLE` | 6 |
| `B-HOLDER_NAME` | 6 |
| `B-DATE_OF_BIRTH` | 6 |
| `B-FATHER_NAME` | 4 |
| `I-HOLDER_NAME` | 2 |

---

## Per-Document Summary

| File | Tokens | Entities | O Tokens | OCR Method | Status |
|------|--------|----------|----------|------------|--------|
| `pan_001.png` | 17 | 7 | 10 | easyocr | OK |
| `pan_002.png` | 21 | 7 | 14 | easyocr | OK |
| `pan_003.png` | 19 | 7 | 12 | easyocr | OK |
| `pan_004.png` | 13 | 7 | 6 | easyocr | OK |
| `pan_005.png` | 13 | 8 | 5 | easyocr | OK |
| `pan_006.png` | 21 | 7 | 14 | easyocr | OK |

---

## Validation

Run the dataset validator to confirm all JSONs pass schema checks:

```powershell
python training/validate_dataset.py
```

---

## Next Steps

1. Review pre-labeled JSONs in `dataset/pan card/labels/` manually.
2. Correct mis-labeled or missed entities.
3. Run `python training/validate_dataset.py` to confirm 0 errors.
4. Once ground-truth annotations are complete, proceed to Colab training.