# LifeVault Dataset Quality Report

> Generated: 2026-07-04 15:44:59
> Tool: `training/validate_dataset.py`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Annotation Files | 181 |
| Valid Files (no errors) | 181 |
| Files with Errors | 0 |
| Total Tokens | 40281 |
| Dataset Readiness Score | **100.0%** |
| Training Status | **✅ READY** |

> [!NOTE]
> All annotation files passed validation. The dataset is structurally ready for LayoutLMv3 fine-tuning.

---

## Category Sample Distribution

| Category | Files | Tokens | Errors |
|----------|-------|--------|--------|
| resume | 51 | 38574 | ✅ 0 |
| passport | 1 | 8 | ✅ 0 |
| pan | 1 | 8 | ✅ 0 |
| aadhaar | 1 | 8 | ✅ 0 |
| student_id | 101 | 1075 | ✅ 0 |
| certificates | 22 | 568 | ✅ 0 |
| internship | 1 | 9 | ✅ 0 |
| fee_receipts | 1 | 13 | ✅ 0 |
| medical | 1 | 9 | ✅ 0 |
| insurance | 1 | 9 | ✅ 0 |

---

## Entity Label Frequency

Counts the occurrences of each **B-** entity label (first token of each entity span).

| Entity Label | Count | Coverage |
|-------------|-------|----------|
| `B-ISSUE_DATE` | 419 | ████████████████████ |
| `B-SKILL` | 150 | ████████ |
| `B-DOCUMENT_TITLE` | 142 | ███████ |
| `B-HOLDER_NAME` | 136 | ███████ |
| `B-ORGANIZATION` | 82 | ████ |
| `B-DOCUMENT_NUMBER` | 12 | █ |
| `B-EXPIRY_DATE` | 3 | █ |
| `B-EMAIL` | 1 | █ |
| `B-NATIONALITY` | 1 | █ |
| `B-TOTAL_AMOUNT` | 1 | █ |
| `B-PROVIDER_NAME` | 1 | █ |
| `B-INSURANCE_COMPANY` | 1 | █ |

### Full Label Frequency (all BIO tags)

| Label | Count |
|-------|-------|
| `O` | 38768 |
| `B-ISSUE_DATE` | 419 |
| `I-HOLDER_NAME` | 246 |
| `I-DOCUMENT_TITLE` | 222 |
| `B-SKILL` | 150 |
| `B-DOCUMENT_TITLE` | 142 |
| `B-HOLDER_NAME` | 136 |
| `I-ORGANIZATION` | 88 |
| `B-ORGANIZATION` | 82 |
| `B-DOCUMENT_NUMBER` | 12 |
| `I-DOCUMENT_NUMBER` | 4 |
| `B-EXPIRY_DATE` | 3 |
| `I-PROVIDER_NAME` | 2 |
| `I-INSURANCE_COMPANY` | 2 |
| `B-EMAIL` | 1 |
| `B-NATIONALITY` | 1 |
| `B-TOTAL_AMOUNT` | 1 |
| `B-PROVIDER_NAME` | 1 |
| `B-INSURANCE_COMPANY` | 1 |

---

## Label Consistency Analysis

The following entity types have **B- tokens but no I- continuations** (all entities are single-token — this is normal for short fields):

- `B-EMAIL` (no matching `I-EMAIL` found)
- `B-EXPIRY_DATE` (no matching `I-EXPIRY_DATE` found)
- `B-ISSUE_DATE` (no matching `I-ISSUE_DATE` found)
- `B-NATIONALITY` (no matching `I-NATIONALITY` found)
- `B-SKILL` (no matching `I-SKILL` found)
- `B-TOTAL_AMOUNT` (no matching `I-TOTAL_AMOUNT` found)

---

## Detailed Validation Log

### `resume/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [800, 1000] does not match actual image size [100, 100].

### `passport/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [800, 600] does not match actual image size [100, 100].

### `pan/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [600, 400] does not match actual image size [100, 100].

### `aadhaar/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [600, 400] does not match actual image size [100, 100].

### `student_id/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [500, 300] does not match actual image size [100, 100].

### `certificates/certificate_001.json`

**Warnings:**

- ⚠️  'image_dimensions' [1224, 1584] does not match actual image size [612, 792].

### `certificates/certificate_003.json`

**Warnings:**

- ⚠️  'image_dimensions' [841, 595] does not match actual image size [842, 596].

### `certificates/certificate_005.json`

**Warnings:**

- ⚠️  'image_dimensions' [1224, 1584] does not match actual image size [612, 792].

### `certificates/certificate_006.json`

**Warnings:**

- ⚠️  'image_dimensions' [841, 595] does not match actual image size [842, 596].

### `certificates/certificate_007.json`

**Warnings:**

- ⚠️  'image_dimensions' [1224, 1584] does not match actual image size [612, 792].

### `certificates/certificate_008.json`

**Warnings:**

- ⚠️  'image_dimensions' [3119, 2673] does not match actual image size [1560, 1337].

### `certificates/certificate_009.json`

**Warnings:**

- ⚠️  'image_dimensions' [842, 595] does not match actual image size [843, 596].

### `certificates/certificate_010.json`

**Warnings:**

- ⚠️  'image_dimensions' [1605, 1186] does not match actual image size [803, 593].

### `certificates/certificate_011.json`

**Warnings:**

- ⚠️  'image_dimensions' [841, 595] does not match actual image size [842, 596].

### `certificates/certificate_012.json`

**Warnings:**

- ⚠️  'image_dimensions' [1224, 1584] does not match actual image size [612, 792].

### `certificates/certificate_013.json`

**Warnings:**

- ⚠️  'image_dimensions' [14032, 9920] does not match actual image size [7016, 4960].

### `certificates/certificate_015.json`

**Warnings:**

- ⚠️  'image_dimensions' [841, 595] does not match actual image size [842, 596].

### `certificates/certificate_018.json`

**Warnings:**

- ⚠️  'image_dimensions' [841, 595] does not match actual image size [842, 596].

### `certificates/certificate_021.json`

**Warnings:**

- ⚠️  'image_dimensions' [3200, 2380] does not match actual image size [1600, 1190].

### `certificates/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [1000, 700] does not match actual image size [100, 100].

### `internship/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [800, 600] does not match actual image size [100, 100].

### `fee_receipts/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [800, 1100] does not match actual image size [100, 100].

### `medical/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [800, 1000] does not match actual image size [100, 100].

### `insurance/sample.json`

**Warnings:**

- ⚠️  'image_dimensions' [800, 1000] does not match actual image size [100, 100].

---

## Recommendations

1. ✅ All sample annotations are structurally valid.
2. **Add real document images** to each `dataset/<category>/images/` folder and create corresponding token-level annotation JSON files (using the schema defined in `dataset/schema.json`).
3. Aim for a minimum of **30 annotated documents per category** (300 total) before starting Colab training.
4. Run this validator again after each batch of new annotations.
5. Once dataset size and quality targets are met, proceed with `training/layoutlmv3_training.ipynb` in Google Colab.
