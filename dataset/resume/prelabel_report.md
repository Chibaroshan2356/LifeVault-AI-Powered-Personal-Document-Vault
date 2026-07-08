# Resume Dataset Pre-label Report

> Generated: 2026-07-03 15:17:28
> Tool: `tools/build_resume_labels.py`

---

## Summary

| Metric | Value |
|--------|-------|
| Total Resumes Processed | 50/50 |
| Total OCR Tokens | 38,567 |
| Auto-labelled Entities (non-O) | 1,078 (2.8%) |
| Remaining O Tokens | 37,489 (97.2%) |

> [!NOTE]
> A high proportion of `O` tokens is normal at this stage.
> The pre-labeler focuses on precision (no false positives) over recall.
> Manual review is required to complete ground-truth annotation.

---

## Entity Label Frequency

| Label | Count |
|-------|-------|
| `O` | 37,489 |
| `B-ISSUE_DATE` | 401 |
| `I-HOLDER_NAME` | 186 |
| `I-DOCUMENT_TITLE` | 150 |
| `B-SKILL` | 148 |
| `B-DOCUMENT_TITLE` | 100 |
| `B-HOLDER_NAME` | 50 |
| `B-ORGANIZATION` | 43 |

---

## Per-Document Summary

| File | Tokens | Entities | O Tokens | OCR Method | Status |
|------|--------|----------|----------|------------|--------|
| `resume_001.pdf` | 775 | 27 | 748 | pymupdf | OK |
| `resume_002.pdf` | 658 | 10 | 648 | pymupdf | OK |
| `resume_003.pdf` | 766 | 11 | 755 | pymupdf | OK |
| `resume_004.pdf` | 1314 | 18 | 1296 | pymupdf | OK |
| `resume_005.pdf` | 733 | 10 | 723 | pymupdf | OK |
| `resume_006.pdf` | 1431 | 26 | 1405 | pymupdf | OK |
| `resume_007.pdf` | 674 | 16 | 658 | pymupdf | OK |
| `resume_008.pdf` | 997 | 25 | 972 | pymupdf | OK |
| `resume_009.pdf` | 846 | 42 | 804 | pymupdf | OK |
| `resume_010.pdf` | 1030 | 13 | 1017 | pymupdf | OK |
| `resume_011.pdf` | 1236 | 56 | 1180 | pymupdf | OK |
| `resume_012.pdf` | 572 | 23 | 549 | pymupdf | OK |
| `resume_013.pdf` | 1171 | 37 | 1134 | pymupdf | OK |
| `resume_014.pdf` | 714 | 29 | 685 | pymupdf | OK |
| `resume_015.pdf` | 659 | 29 | 630 | pymupdf | OK |
| `resume_016.pdf` | 427 | 13 | 414 | pymupdf | OK |
| `resume_017.pdf` | 777 | 8 | 769 | pymupdf | OK |
| `resume_018.pdf` | 774 | 30 | 744 | pymupdf | OK |
| `resume_019.pdf` | 976 | 57 | 919 | pymupdf | OK |
| `resume_020.pdf` | 862 | 23 | 839 | pymupdf | OK |
| `resume_021.pdf` | 658 | 11 | 647 | pymupdf | OK |
| `resume_022.pdf` | 723 | 24 | 699 | pymupdf | OK |
| `resume_023.pdf` | 1182 | 19 | 1163 | pymupdf | OK |
| `resume_024.pdf` | 839 | 27 | 812 | pymupdf | OK |
| `resume_025.pdf` | 149 | 13 | 136 | pymupdf | OK |
| `resume_026.pdf` | 652 | 14 | 638 | pymupdf | OK |
| `resume_027.pdf` | 871 | 11 | 860 | pymupdf | OK |
| `resume_028.pdf` | 214 | 28 | 186 | pymupdf | OK |
| `resume_029.pdf` | 738 | 19 | 719 | pymupdf | OK |
| `resume_030.pdf` | 237 | 17 | 220 | pymupdf | OK |
| `resume_031.pdf` | 773 | 19 | 754 | pymupdf | OK |
| `resume_032.pdf` | 691 | 30 | 661 | pymupdf | OK |
| `resume_033.pdf` | 879 | 12 | 867 | pymupdf | OK |
| `resume_034.pdf` | 459 | 11 | 448 | pymupdf | OK |
| `resume_035.pdf` | 372 | 44 | 328 | pymupdf | OK |
| `resume_036.pdf` | 823 | 24 | 799 | pymupdf | OK |
| `resume_037.pdf` | 1270 | 24 | 1246 | pymupdf | OK |
| `resume_038.pdf` | 1198 | 12 | 1186 | pymupdf | OK |
| `resume_039.pdf` | 1029 | 5 | 1024 | pymupdf | OK |
| `resume_040.pdf` | 763 | 18 | 745 | pymupdf | OK |
| `resume_041.pdf` | 606 | 22 | 584 | pymupdf | OK |
| `resume_042.pdf` | 506 | 17 | 489 | pymupdf | OK |
| `resume_043.pdf` | 731 | 24 | 707 | pymupdf | OK |
| `resume_044.pdf` | 718 | 11 | 707 | pymupdf | OK |
| `resume_045.pdf` | 631 | 18 | 613 | pymupdf | OK |
| `resume_046.pdf` | 684 | 20 | 664 | pymupdf | OK |
| `resume_047.pdf` | 309 | 20 | 289 | pymupdf | OK |
| `resume_048.pdf` | 755 | 24 | 731 | pymupdf | OK |
| `resume_049.pdf` | 688 | 11 | 677 | pymupdf | OK |
| `resume_050.pdf` | 1027 | 26 | 1001 | pymupdf | OK |

---

## Validation

Run the dataset validator to confirm all JSONs pass schema checks:

```powershell
python training/validate_dataset.py
```

---

## Next Steps

1. Review pre-labeled JSONs in `dataset/resume/labels/` manually.
2. Correct any mis-labeled or missed entities.
3. Add image files (convert PDFs to PNG using `pdf2image`) so `image_filename` resolves.
4. Run `python training/validate_dataset.py` to confirm 0 errors.
5. Once 50 ground-truth annotations are complete, proceed to Colab training.