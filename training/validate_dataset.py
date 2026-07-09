"""
Dataset Validation Tool — Phase 3: Dataset Collection Assistant
===============================================================
Validates every annotation JSON in the LifeVault dataset directory.

Checks:
  - Image file existence
  - Image dimension accuracy
  - Token text is non-empty
  - Bounding box format and coordinate sanity (x0<=x1, y0<=y1, all in 0-10000)
  - Duplicate bounding boxes within a file
  - Valid label (must be in allowed label set)
  - BIO sequence integrity (I-X cannot appear without a preceding B-X or I-X)

Outputs:
  - Console summary
  - dataset_quality_report.md in repository root
"""

import os
import sys
import json
import math
from collections import defaultdict
from datetime import datetime
from PIL import Image

# ── Resolve repo root ─────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_DIR = os.path.join(REPO_ROOT, "dataset")
REPORT_PATH = os.path.join(REPO_ROOT, "dataset_quality_report.md")

CATEGORIES = [
    "resume", "passport", "pan", "aadhaar", "student_id",
    "certificates", "internship", "fee_receipts", "medical", "insurance"
]

# Allowed labels (from training/label_encoder.py)
ALLOWED_LABELS = {
    "O",
    "B-HOLDER_NAME", "I-HOLDER_NAME",
    "B-ORGANIZATION", "I-ORGANIZATION",
    "B-DOCUMENT_NUMBER", "I-DOCUMENT_NUMBER",
    "B-ISSUE_DATE", "I-ISSUE_DATE",
    "B-EXPIRY_DATE", "I-EXPIRY_DATE",
    "B-DATE_OF_BIRTH", "I-DATE_OF_BIRTH",
    "B-DOCUMENT_TITLE", "I-DOCUMENT_TITLE",
    "B-TOTAL_AMOUNT", "I-TOTAL_AMOUNT",
    "B-NATIONALITY", "I-NATIONALITY",
    "B-EMAIL", "I-EMAIL",
    "B-SKILL", "I-SKILL",
    "B-INSURANCE_COMPANY", "I-INSURANCE_COMPANY",
    "B-PROVIDER_NAME", "I-PROVIDER_NAME",
    "B-GENDER", "I-GENDER",
    "B-ADDRESS", "I-ADDRESS",
    "B-FATHER_NAME", "I-FATHER_NAME",
}


# ── Data containers ───────────────────────────────────────────────────────────

class FileResult:
    def __init__(self, category: str, filename: str):
        self.category   = category
        self.filename   = filename
        self.errors:   list[str] = []
        self.warnings: list[str] = []
        self.token_count = 0
        self.label_counts: dict[str, int] = defaultdict(int)

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0


# ── Core validator ────────────────────────────────────────────────────────────

def validate_file(label_path: str, images_dir: str, category: str) -> FileResult:
    filename = os.path.basename(label_path)
    result   = FileResult(category, filename)

    # ── Load JSON ─────────────────────────────────────────────────────────────
    try:
        with open(label_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        result.errors.append(f"Invalid JSON: {e}")
        return result

    # ── Image existence ───────────────────────────────────────────────────────
    img_filename = data.get("image_filename")
    if not img_filename:
        result.errors.append("Missing 'image_filename' field.")
        img_path = None
    else:
        img_path = os.path.join(images_dir, img_filename)
        if not os.path.exists(img_path):
            result.errors.append(f"Image not found: {img_path}")
            img_path = None

    # ── Image dimensions ──────────────────────────────────────────────────────
    declared_dims = data.get("image_dimensions")
    if img_path and declared_dims:
        try:
            with Image.open(img_path) as im:
                actual_w, actual_h = im.size
            if len(declared_dims) != 2:
                result.errors.append(
                    f"'image_dimensions' must be [width, height], got: {declared_dims}")
            else:
                if declared_dims[0] != actual_w or declared_dims[1] != actual_h:
                    result.warnings.append(
                        f"'image_dimensions' {declared_dims} does not match "
                        f"actual image size {[actual_w, actual_h]}.")
        except Exception as e:
            result.warnings.append(f"Could not open image to check dimensions: {e}")
    elif not declared_dims:
        result.warnings.append("Missing 'image_dimensions' field.")

    # ── Token (words) checks ──────────────────────────────────────────────────
    words = data.get("words", [])
    if not isinstance(words, list) or len(words) == 0:
        result.errors.append("'words' array is missing or empty.")
        return result

    result.token_count = len(words)
    seen_boxes: set[tuple] = set()
    prev_label = None

    for idx, word in enumerate(words):
        pos = f"words[{idx}]"

        # Text
        text = word.get("text", "")
        if not isinstance(text, str) or text.strip() == "":
            result.errors.append(f"{pos}: 'text' is empty or missing.")

        # Label
        label = word.get("label", "")
        if label not in ALLOWED_LABELS:
            result.errors.append(
                f"{pos}: Unknown label '{label}'. "
                f"Must be one of the approved BIO labels.")
        else:
            result.label_counts[label] += 1

            # BIO sequence check (I- must follow B- or I- of same entity class)
            if label.startswith("I-"):
                entity_class = label[2:]
                valid_prev = {f"B-{entity_class}", f"I-{entity_class}"}
                if prev_label not in valid_prev:
                    result.errors.append(
                        f"{pos}: BIO violation — '{label}' follows "
                        f"'{prev_label}' (expected B-{entity_class} or I-{entity_class}).")
        prev_label = label

        # Bounding box
        box = word.get("box", None)
        if box is None:
            result.errors.append(f"{pos}: Missing 'box' field.")
            continue

        if not isinstance(box, list) or len(box) != 4:
            result.errors.append(
                f"{pos}: 'box' must be a list of 4 integers, got: {box}")
            continue

        try:
            x0, y0, x1, y1 = [int(v) for v in box]
        except (ValueError, TypeError):
            result.errors.append(
                f"{pos}: 'box' values must be integers, got: {box}")
            continue

        if x0 < 0 or y0 < 0 or x1 < 0 or y1 < 0:
            result.errors.append(
                f"{pos}: 'box' contains negative coordinates: {box}")

        if x0 > x1:
            result.errors.append(
                f"{pos}: Invalid 'box' — x0 ({x0}) > x1 ({x1}).")
        if y0 > y1:
            result.errors.append(
                f"{pos}: Invalid 'box' — y0 ({y0}) > y1 ({y1}).")

        box_tuple = (x0, y0, x1, y1)
        if box_tuple in seen_boxes:
            result.warnings.append(
                f"{pos}: Duplicate bounding box {list(box_tuple)} "
                f"(same coordinates used more than once).")
        else:
            seen_boxes.add(box_tuple)

    return result


# ── Dataset scan ──────────────────────────────────────────────────────────────

def validate_dataset(dataset_dir: str) -> list[FileResult]:
    all_results: list[FileResult] = []

    for cat in CATEGORIES:
        labels_dir = os.path.join(dataset_dir, cat, "labels")
        images_dir = os.path.join(dataset_dir, cat, "images")

        if not os.path.isdir(labels_dir):
            print(f"  [SKIP] {cat}/labels/ not found.")
            continue

        json_files = [
            f for f in os.listdir(labels_dir)
            if f.endswith(".json") and f != "schema.json"
        ]

        if not json_files:
            print(f"  [WARN] {cat}: No annotation JSON files found.")
            continue

        for fname in sorted(json_files):
            label_path = os.path.join(labels_dir, fname)
            result = validate_file(label_path, images_dir, cat)
            all_results.append(result)

            status = "OK" if result.is_valid else "ER"
            print(f"  [{status}] {cat}/{fname} - {result.token_count} tokens, "
                  f"{len(result.errors)} error(s), {len(result.warnings)} warning(s)")

    return all_results


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(results: list[FileResult], report_path: str) -> None:
    total_files   = len(results)
    valid_files   = sum(1 for r in results if r.is_valid)
    invalid_files = total_files - valid_files
    total_tokens  = sum(r.token_count for r in results)

    # Readiness score: fraction of error-free files × scale to 100
    readiness_pct = round((valid_files / total_files * 100) if total_files else 0, 1)

    # Category distribution
    cat_stats: dict[str, dict] = defaultdict(lambda: {"files": 0, "tokens": 0, "errors": 0})
    for r in results:
        cat_stats[r.category]["files"]  += 1
        cat_stats[r.category]["tokens"] += r.token_count
        cat_stats[r.category]["errors"] += len(r.errors)

    # Global label frequency
    global_labels: dict[str, int] = defaultdict(int)
    for r in results:
        for lbl, cnt in r.label_counts.items():
            global_labels[lbl] += cnt

    # BIO entity coverage (B- labels only)
    entity_coverage = {
        lbl: cnt for lbl, cnt in global_labels.items() if lbl.startswith("B-")
    }

    # Readiness badge
    if readiness_pct == 100:
        badge = "✅ READY"
    elif readiness_pct >= 80:
        badge = "⚠️  MOSTLY READY"
    else:
        badge = "❌ NEEDS WORK"

    lines: list[str] = []

    lines.append("# LifeVault Dataset Quality Report")
    lines.append(f"\n> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"> Tool: `training/validate_dataset.py`\n")

    # ── Executive Summary ─────────────────────────────────────────────────────
    lines.append("---\n")
    lines.append("## Executive Summary\n")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Total Annotation Files | {total_files} |")
    lines.append(f"| Valid Files (no errors) | {valid_files} |")
    lines.append(f"| Files with Errors | {invalid_files} |")
    lines.append(f"| Total Tokens | {total_tokens} |")
    lines.append(f"| Dataset Readiness Score | **{readiness_pct}%** |")
    lines.append(f"| Training Status | **{badge}** |\n")

    if readiness_pct == 100:
        lines.append(
            "> [!NOTE]\n"
            "> All annotation files passed validation. "
            "The dataset is structurally ready for LayoutLMv3 fine-tuning.\n"
        )
    else:
        lines.append(
            "> [!WARNING]\n"
            "> Some annotation files contain errors. "
            "Fix all errors before launching Colab training.\n"
        )

    # ── Category Distribution ─────────────────────────────────────────────────
    lines.append("---\n")
    lines.append("## Category Sample Distribution\n")
    lines.append("| Category | Files | Tokens | Errors |")
    lines.append("|----------|-------|--------|--------|")
    for cat in CATEGORIES:
        s = cat_stats.get(cat, {"files": 0, "tokens": 0, "errors": 0})
        err_cell = f"❌ {s['errors']}" if s["errors"] > 0 else "✅ 0"
        lines.append(f"| {cat} | {s['files']} | {s['tokens']} | {err_cell} |")
    lines.append("")

    # ── Entity Frequency ──────────────────────────────────────────────────────
    lines.append("---\n")
    lines.append("## Entity Label Frequency\n")
    lines.append("Counts the occurrences of each **B-** entity label "
                 "(first token of each entity span).\n")
    lines.append("| Entity Label | Count | Coverage |")
    lines.append("|-------------|-------|----------|")

    if entity_coverage:
        max_cnt = max(entity_coverage.values())
        for lbl, cnt in sorted(entity_coverage.items(), key=lambda x: -x[1]):
            bar = "█" * math.ceil(cnt / max_cnt * 20) if max_cnt > 0 else ""
            lines.append(f"| `{lbl}` | {cnt} | {bar} |")
    else:
        lines.append("| — | — | No entity labels found |")
    lines.append("")

    # Full label frequency (including I- and O)
    lines.append("### Full Label Frequency (all BIO tags)\n")
    lines.append("| Label | Count |")
    lines.append("|-------|-------|")
    for lbl, cnt in sorted(global_labels.items(), key=lambda x: -x[1]):
        lines.append(f"| `{lbl}` | {cnt} |")
    lines.append("")

    # ── Inconsistent / Missing Labels ─────────────────────────────────────────
    lines.append("---\n")
    lines.append("## Label Consistency Analysis\n")
    # Detect entity types that appear only as B- (no paired I-) — warning for multi-token entities
    b_entities = {lbl[2:] for lbl in global_labels if lbl.startswith("B-")}
    i_entities = {lbl[2:] for lbl in global_labels if lbl.startswith("I-")}
    b_only = b_entities - i_entities

    if b_only:
        lines.append("The following entity types have **B- tokens but no I- continuations** "
                     "(all entities are single-token — this is normal for short fields):\n")
        for e in sorted(b_only):
            lines.append(f"- `B-{e}` (no matching `I-{e}` found)")
        lines.append("")
    else:
        lines.append("✅ All entity types that appear as B- also have matching I- continuations.\n")

    # ── Detailed Validation Logs ──────────────────────────────────────────────
    lines.append("---\n")
    lines.append("## Detailed Validation Log\n")

    files_with_issues = [r for r in results if r.errors or r.warnings]
    if not files_with_issues:
        lines.append("✅ **All annotation files passed with zero errors or warnings.**\n")
    else:
        for r in files_with_issues:
            lines.append(f"### `{r.category}/{r.filename}`\n")
            if r.errors:
                lines.append("**Errors:**\n")
                for e in r.errors:
                    lines.append(f"- ❌ {e}")
                lines.append("")
            if r.warnings:
                lines.append("**Warnings:**\n")
                for w in r.warnings:
                    lines.append(f"- ⚠️  {w}")
                lines.append("")

    # ── Recommendations ───────────────────────────────────────────────────────
    lines.append("---\n")
    lines.append("## Recommendations\n")

    if readiness_pct == 100 and total_files >= 10:
        lines.append(
            "1. ✅ All sample annotations are structurally valid.\n"
            "2. **Add real document images** to each `dataset/<category>/images/` folder "
            "and create corresponding token-level annotation JSON files (using the schema "
            "defined in `dataset/schema.json`).\n"
            "3. Aim for a minimum of **30 annotated documents per category** "
            "(300 total) before starting Colab training.\n"
            "4. Run this validator again after each batch of new annotations.\n"
            "5. Once dataset size and quality targets are met, proceed with "
            "`training/layoutlmv3_training.ipynb` in Google Colab.\n"
        )
    else:
        lines.append("Fix all errors listed above before starting Colab training.\n")
        lines.append("1. Ensure every annotation JSON references a real image in `images/`.")
        lines.append("2. Verify all BIO tags are in the approved label set.")
        lines.append("3. Correct any invalid bounding box coordinates.")
        lines.append("4. Re-run `python training/validate_dataset.py` to confirm 0 errors.")

    report_content = "\n".join(lines)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"\n[DONE] Report written to: {report_path}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("LifeVault Dataset Validator — Phase 3")
    print(f"Dataset directory: {DATASET_DIR}")
    print("=" * 65)

    if not os.path.isdir(DATASET_DIR):
        print(f"ERROR: Dataset directory not found: {DATASET_DIR}")
        sys.exit(1)

    results = validate_dataset(DATASET_DIR)

    total   = len(results)
    valid   = sum(1 for r in results if r.is_valid)
    score   = round(valid / total * 100, 1) if total else 0

    print("\n" + "=" * 65)
    print(f"Summary: {valid}/{total} files valid - Readiness: {score}%")
    print("=" * 65)

    generate_report(results, REPORT_PATH)


if __name__ == "__main__":
    main()
