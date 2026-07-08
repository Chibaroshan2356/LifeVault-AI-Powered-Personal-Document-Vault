# Student ID Dataset Pre-label Report

> Generated: 2026-07-04 15:44:45
> Tool: `tools/prepare_dataset.py`

---

## Summary

| Metric | Value |
|--------|-------|
| Total Student IDs Processed | 100/100 |
| Total OCR Tokens | 1,066 |
| Auto-labelled Entities (non-O) | 250 (23.5%) |
| Remaining O Tokens | 816 (76.5%) |

> [!NOTE]
> A high proportion of `O` tokens is normal at this stage.
> The pre-labeler prioritizes precision. Manual review is required
> to complete ground-truth annotations before training.

---

## Entity Label Frequency

| Label | Count |
|-------|-------|
| `O` | 816 |
| `I-ORGANIZATION` | 73 |
| `B-HOLDER_NAME` | 58 |
| `I-HOLDER_NAME` | 32 |
| `B-ORGANIZATION` | 28 |
| `I-DOCUMENT_TITLE` | 22 |
| `B-DOCUMENT_TITLE` | 17 |
| `B-ISSUE_DATE` | 9 |
| `B-DOCUMENT_NUMBER` | 6 |
| `B-EXPIRY_DATE` | 3 |
| `I-DOCUMENT_NUMBER` | 2 |

---

## Per-Document Summary

| File | Tokens | Entities | O Tokens | OCR Method | Status |
|------|--------|----------|----------|------------|--------|
| `student_id_001.jpg` | 10 | 4 | 6 | easyocr | OK |
| `student_id_002.jpg` | 10 | 0 | 10 | easyocr | OK |
| `student_id_003.jpg` | 16 | 2 | 14 | easyocr | OK |
| `student_id_004.jpg` | 12 | 5 | 7 | easyocr | OK |
| `student_id_005.jpg` | 12 | 1 | 11 | easyocr | OK |
| `student_id_006.jpg` | 9 | 0 | 9 | easyocr | OK |
| `student_id_007.jpg` | 8 | 4 | 4 | easyocr | OK |
| `student_id_008.jpg` | 12 | 7 | 5 | easyocr | OK |
| `student_id_009.jpg` | 21 | 1 | 20 | easyocr | OK |
| `student_id_010.jpg` | 11 | 6 | 5 | easyocr | OK |
| `student_id_011.jpg` | 8 | 1 | 7 | easyocr | OK |
| `student_id_012.jpg` | 13 | 5 | 8 | easyocr | OK |
| `student_id_013.jpg` | 5 | 3 | 2 | easyocr | OK |
| `student_id_014.jpg` | 7 | 5 | 2 | easyocr | OK |
| `student_id_015.jpg` | 6 | 0 | 6 | easyocr | OK |
| `student_id_016.jpg` | 10 | 0 | 10 | easyocr | OK |
| `student_id_017.jpg` | 6 | 4 | 2 | easyocr | OK |
| `student_id_018.jpg` | 6 | 5 | 1 | easyocr | OK |
| `student_id_019.jpg` | 10 | 5 | 5 | easyocr | OK |
| `student_id_020.jpg` | 9 | 0 | 9 | easyocr | OK |
| `student_id_021.jpg` | 15 | 6 | 9 | easyocr | OK |
| `student_id_022.jpg` | 25 | 1 | 24 | easyocr | OK |
| `student_id_023.jpg` | 8 | 2 | 6 | easyocr | OK |
| `student_id_024.jpg` | 26 | 15 | 11 | easyocr | OK |
| `student_id_025.jpg` | 8 | 0 | 8 | easyocr | OK |
| `student_id_026.jpg` | 20 | 4 | 16 | easyocr | OK |
| `student_id_027.jpg` | 14 | 3 | 11 | easyocr | OK |
| `student_id_028.jpg` | 12 | 3 | 9 | easyocr | OK |
| `student_id_029.jpg` | 13 | 2 | 11 | easyocr | OK |
| `student_id_030.jpg` | 15 | 0 | 15 | easyocr | OK |
| `student_id_031.jpg` | 22 | 0 | 22 | easyocr | OK |
| `student_id_032.jpg` | 14 | 11 | 3 | easyocr | OK |
| `student_id_033.jpg` | 19 | 0 | 19 | easyocr | OK |
| `student_id_034.jpg` | 23 | 1 | 22 | easyocr | OK |
| `student_id_035.jpg` | 15 | 4 | 11 | easyocr | OK |
| `student_id_036.jpg` | 19 | 6 | 13 | easyocr | OK |
| `student_id_037.jpg` | 13 | 4 | 9 | easyocr | OK |
| `student_id_038.jpg` | 17 | 2 | 15 | easyocr | OK |
| `student_id_039.jpg` | 14 | 0 | 14 | easyocr | OK |
| `student_id_040.jpg` | 22 | 1 | 21 | easyocr | OK |
| `student_id_041.jpg` | 14 | 2 | 12 | easyocr | OK |
| `student_id_042.jpg` | 16 | 0 | 16 | easyocr | OK |
| `student_id_043.jpg` | 4 | 0 | 4 | easyocr | OK |
| `student_id_044.jpg` | 9 | 7 | 2 | easyocr | OK |
| `student_id_045.jpg` | 11 | 0 | 11 | easyocr | OK |
| `student_id_046.jpg` | 15 | 1 | 14 | easyocr | OK |
| `student_id_047.jpg` | 24 | 3 | 21 | easyocr | OK |
| `student_id_048.jpg` | 14 | 2 | 12 | easyocr | OK |
| `student_id_049.jpg` | 11 | 0 | 11 | easyocr | OK |
| `student_id_050.jpg` | 19 | 1 | 18 | easyocr | OK |
| `student_id_051.jpg` | 14 | 0 | 14 | easyocr | OK |
| `student_id_052.jpg` | 20 | 7 | 13 | easyocr | OK |
| `student_id_053.jpg` | 2 | 0 | 2 | easyocr | OK |
| `student_id_054.jpg` | 8 | 0 | 8 | easyocr | OK |
| `student_id_055.jpg` | 9 | 0 | 9 | easyocr | OK |
| `student_id_056.jpg` | 6 | 6 | 0 | easyocr | OK |
| `student_id_057.jpg` | 4 | 3 | 1 | easyocr | OK |
| `student_id_058.jpg` | 10 | 0 | 10 | easyocr | OK |
| `student_id_059.jpg` | 10 | 0 | 10 | easyocr | OK |
| `student_id_060.jpg` | 10 | 7 | 3 | easyocr | OK |
| `student_id_061.jpg` | 7 | 3 | 4 | easyocr | OK |
| `student_id_062.jpg` | 5 | 3 | 2 | easyocr | OK |
| `student_id_063.jpg` | 12 | 0 | 12 | easyocr | OK |
| `student_id_064.jpg` | 12 | 0 | 12 | easyocr | OK |
| `student_id_065.jpg` | 6 | 5 | 1 | easyocr | OK |
| `student_id_066.jpg` | 5 | 1 | 4 | easyocr | OK |
| `student_id_067.jpg` | 15 | 0 | 15 | easyocr | OK |
| `student_id_068.jpg` | 12 | 0 | 12 | easyocr | OK |
| `student_id_069.jpg` | 5 | 1 | 4 | easyocr | OK |
| `student_id_070.jpg` | 11 | 0 | 11 | easyocr | OK |
| `student_id_071.jpg` | 4 | 4 | 0 | easyocr | OK |
| `student_id_072.jpg` | 4 | 4 | 0 | easyocr | OK |
| `student_id_073.jpg` | 5 | 5 | 0 | easyocr | OK |
| `student_id_074.jpg` | 4 | 3 | 1 | easyocr | OK |
| `student_id_075.jpg` | 9 | 1 | 8 | easyocr | OK |
| `student_id_076.jpg` | 5 | 4 | 1 | easyocr | OK |
| `student_id_077.jpg` | 4 | 0 | 4 | easyocr | OK |
| `student_id_078.jpg` | 9 | 0 | 9 | easyocr | OK |
| `student_id_079.jpg` | 11 | 0 | 11 | easyocr | OK |
| `student_id_080.jpg` | 6 | 4 | 2 | easyocr | OK |
| `student_id_081.jpg` | 11 | 0 | 11 | easyocr | OK |
| `student_id_082.jpg` | 6 | 3 | 3 | easyocr | OK |
| `student_id_083.jpg` | 7 | 0 | 7 | easyocr | OK |
| `student_id_084.jpg` | 5 | 5 | 0 | easyocr | OK |
| `student_id_085.jpg` | 4 | 3 | 1 | easyocr | OK |
| `student_id_086.jpg` | 10 | 4 | 6 | easyocr | OK |
| `student_id_087.jpg` | 4 | 3 | 1 | easyocr | OK |
| `student_id_088.jpg` | 12 | 1 | 11 | easyocr | OK |
| `student_id_089.jpg` | 10 | 1 | 9 | easyocr | OK |
| `student_id_090.jpg` | 13 | 7 | 6 | easyocr | OK |
| `student_id_091.jpg` | 6 | 4 | 2 | easyocr | OK |
| `student_id_092.jpg` | 5 | 3 | 2 | easyocr | OK |
| `student_id_093.jpg` | 7 | 0 | 7 | easyocr | OK |
| `student_id_094.jpg` | 3 | 3 | 0 | easyocr | OK |
| `student_id_095.jpg` | 10 | 2 | 8 | easyocr | OK |
| `student_id_096.jpg` | 8 | 2 | 6 | easyocr | OK |
| `student_id_097.jpg` | 10 | 0 | 10 | easyocr | OK |
| `student_id_098.jpg` | 11 | 6 | 5 | easyocr | OK |
| `student_id_099.jpg` | 3 | 3 | 0 | easyocr | OK |
| `student_id_100.jpg` | 5 | 0 | 5 | easyocr | OK |

---

## Validation

Run the dataset validator to confirm all JSONs pass schema checks:

```powershell
python training/validate_dataset.py
```

---

## Next Steps

1. Review pre-labeled JSONs in `dataset/student id/labels/` manually.
2. Correct mis-labeled or missed entities.
3. Run `python training/validate_dataset.py` to confirm 0 errors.
4. Once ground-truth annotations are complete, proceed to Colab training.