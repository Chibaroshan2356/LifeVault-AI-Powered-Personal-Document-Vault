"""
tools/prepare_dataset.py
=========================
Generic dataset preparation CLI for the LifeVault LayoutLMv3 pipeline.

Supports all document categories by loading the appropriate prelabel plugin.
Handles: PDF, PNG, JPG, JPEG source files.

Usage:
    # Certificates from a folder
    python tools/prepare_dataset.py --category certificate --source-dir "C:\\Dev\\LifeVault\\certificates"

    # Resumes (same as build_resume_labels.py)
    python tools/prepare_dataset.py --category resume

    # Test with first 5 files only
    python tools/prepare_dataset.py --category certificate --source-dir "..." --limit 5

    # Spot-check 5 annotations after build
    python tools/prepare_dataset.py --category certificate --verify 5
"""

import os
import sys
import shutil
import argparse
import logging
import json
import random
from collections import defaultdict

# ── Allow running from repo root OR from tools/ ──────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT  = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

# Add tools/ to sys.path so `import prelabel.xxx` and sibling imports work
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import ocr_pipeline      as ocr
import annotation_writer as aw
from prelabel import get_prelabeler

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SUPPORTED_EXTS = {".pdf", ".png", ".jpg", ".jpeg"}

# ── Category meta map ─────────────────────────────────────────────────────────
# "folder" key overrides the dataset/ subdirectory name (defaults to category key).
# Must match the CATEGORIES list in training/validate_dataset.py.
CATEGORY_META = {
    "resume":       {"display": "Resume",       "prefix": "resume",       "folder": "resume"},
    "certificate":  {"display": "Certificate",  "prefix": "certificate",  "folder": "certificates"},
    "pan":          {"display": "PAN Card",      "prefix": "pan",          "folder": "pan"},
    "aadhaar":      {"display": "Aadhaar Card",  "prefix": "aadhaar",      "folder": "aadhaar"},
    "student_id":   {"display": "Student ID",    "prefix": "student_id",   "folder": "student_id"},
    "passport":     {"display": "Passport",      "prefix": "passport",     "folder": "passport"},
    "medical":      {"display": "Medical",       "prefix": "medical",      "folder": "medical"},
    "insurance":    {"display": "Insurance",     "prefix": "insurance",    "folder": "insurance"},
    "internship":   {"display": "Internship",    "prefix": "internship",   "folder": "internship"},
    "fee_receipts": {"display": "Fee Receipt",   "prefix": "fee_receipt",  "folder": "fee_receipts"},
}


def _dataset_paths(category: str) -> tuple[str, str, str, str]:
    """Return (images_dir, labels_dir, csv_path, report_path) for a category."""
    meta        = CATEGORY_META.get(category, {})
    folder      = meta.get("folder", category)   # use explicit folder name if set
    base        = os.path.join(REPO_ROOT, "dataset", folder)
    images_dir  = os.path.join(base, "images")
    labels_dir  = os.path.join(base, "labels")
    csv_path    = os.path.join(base, "selected_files.csv")
    report_path = os.path.join(base, "prelabel_report.md")
    return images_dir, labels_dir, csv_path, report_path


def _collect_sources(source_dir: str) -> list[str]:
    """Recursively find all supported files in source_dir."""
    found = []
    for root, _, files in os.walk(source_dir):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in SUPPORTED_EXTS:
                found.append(os.path.join(root, f))
    return found


def copy_and_rename(source_dir: str, images_dir: str, prefix: str) -> list[dict]:
    """Copy source files into images_dir with sequential prefix naming."""
    sources = _collect_sources(source_dir)
    if not sources:
        print(f"ERROR: No supported files found in: {source_dir}")
        sys.exit(1)

    print(f"Found {len(sources)} files in source directory.")
    os.makedirs(images_dir, exist_ok=True)

    records = []
    for idx, src in enumerate(sources, start=1):
        ext      = os.path.splitext(src)[1].lower()
        new_name = f"{prefix}_{idx:03d}{ext}"
        dst      = os.path.join(images_dir, new_name)
        shutil.copy2(src, dst)
        records.append({
            "original_path":     src,
            "original_filename": os.path.basename(src),
            "new_filename":      new_name,
        })
        print(f"  Copied [{idx:3d}/{len(sources)}]: {os.path.basename(src)} -> {new_name}")

    return records


def process_files(
    images_dir: str,
    labels_dir: str,
    prefix: str,
    category_display: str,
    prelabeler,
    limit: int | None = None,
) -> list[dict]:
    """OCR + prelabel + write JSON for all files in images_dir."""
    os.makedirs(labels_dir, exist_ok=True)

    # Collect all candidate files, then deduplicate by stem.
    # PNG companions (rendered from PDFs for the validator) must not be processed
    # as separate documents — prefer the original source extension.
    PRIORITY = {".pdf": 0, ".jpeg": 1, ".jpg": 2, ".png": 3}
    stem_map: dict[str, str] = {}  # stem -> chosen filename
    for f in os.listdir(images_dir):
        ext = os.path.splitext(f)[1].lower()
        if ext not in SUPPORTED_EXTS:
            continue
        if not f.startswith(prefix):
            continue
        stem = os.path.splitext(f)[0]
        current = stem_map.get(stem)
        if current is None:
            stem_map[stem] = f
        else:
            cur_ext = os.path.splitext(current)[1].lower()
            if PRIORITY.get(ext, 9) < PRIORITY.get(cur_ext, 9):
                stem_map[stem] = f  # keep higher-priority (non-PNG) format

    all_files = sorted(stem_map.values())

    if not all_files:
        print(f"ERROR: No {prefix}_NNN files found in {images_dir}")
        print("Run with --source-dir first.")
        sys.exit(1)

    if limit:
        all_files = all_files[:limit]

    print(f"\nProcessing {len(all_files)} file(s) ...")
    stats: list[dict] = []

    for i, fname in enumerate(all_files, start=1):
        src_path    = os.path.join(images_dir, fname)
        base        = os.path.splitext(fname)[0]
        label_path  = os.path.join(labels_dir, base + ".json")

        print(f"[{i:3d}/{len(all_files)}] {fname}")

        stat = {
            "filename":     fname,
            "status":       "ok",
            "method":       "unknown",
            "token_count":  0,
            "label_counts": defaultdict(int),
        }

        try:
            # OCR
            words, pw, ph = ocr.get_word_boxes(src_path)
            if not words:
                raise ValueError("No words extracted.")

            ext = os.path.splitext(fname)[1].lower()
            stat["method"] = "pymupdf" if ext == ".pdf" else "easyocr"

            # Pre-label
            tokens = prelabeler(words)
            stat["token_count"] = len(tokens)
            for t in tokens:
                stat["label_counts"][t["label"]] += 1

            # Annotation JSON
            annotation = aw.build_annotation(category_display, fname, tokens, pw, ph)
            aw.write_annotation(annotation, label_path)

            # PNG companion for validator image_filename resolution
            png_path = os.path.join(images_dir, base + ".png")
            if not os.path.exists(png_path):
                ocr.render_to_png(src_path, png_path)

            ne = len(tokens) - stat["label_counts"].get("O", 0)
            print(f"         Tokens={len(tokens)}, Entities={ne}, "
                  f"O={stat['label_counts'].get('O',0)}, Method={stat['method']}")

        except Exception as e:
            logger.error(f"Failed: {fname}: {e}")
            stat["status"] = "failed"
            stat["error"]  = str(e)

        stats.append(stat)

    return stats


def verify_annotations(labels_dir: str, images_dir: str, n: int = 5) -> None:
    """Spot-check N random annotation files and print a verification summary."""
    json_files = sorted([
        f for f in os.listdir(labels_dir)
        if f.endswith(".json") and f != "schema.json" and f != "sample.json"
    ])
    if not json_files:
        print("No annotations to verify.")
        return

    sample = random.sample(json_files, min(n, len(json_files)))
    print(f"\n{'='*65}")
    print(f"Spot-check: {len(sample)} random annotations")
    print(f"{'='*65}")

    CHECK_ENTITIES = ["HOLDER_NAME", "ORGANIZATION", "DOCUMENT_TITLE", "ISSUE_DATE"]
    all_results = []

    for fname in sorted(sample):
        with open(os.path.join(labels_dir, fname), encoding="utf-8") as f:
            data = json.load(f)

        words      = data.get("words", [])
        found_ents = {e: False for e in CHECK_ENTITIES}

        for w in words:
            lbl = w.get("label", "O")
            for ent in CHECK_ENTITIES:
                if ent in lbl:
                    found_ents[ent] = True

        print(f"\n  {fname}")
        for ent, found in found_ents.items():
            mark = "OK" if found else "--"
            print(f"    [{mark}] {ent}")

        all_results.append(found_ents)

    print(f"\n{'='*65}")
    print("Detection Rate Summary:")
    for ent in CHECK_ENTITIES:
        rate = sum(1 for r in all_results if r[ent]) / len(all_results) * 100
        print(f"  {ent:20s}: {rate:5.1f}% ({sum(1 for r in all_results if r[ent])}/{len(all_results)})")
    print(f"{'='*65}\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="LifeVault generic dataset preparation tool."
    )
    parser.add_argument("--category",   required=True,
                        help="Document category (e.g. resume, certificate, pan).")
    parser.add_argument("--source-dir", default=None,
                        help="Source folder containing input files (PDF/PNG/JPG).")
    parser.add_argument("--limit",      type=int, default=None,
                        help="Process only first N files (for testing).")
    parser.add_argument("--verify",     type=int, default=0,
                        help="Spot-check N random annotations after build.")
    parser.add_argument("--verbose",    action="store_true",
                        help="Enable verbose logging.")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    cat  = args.category.lower()
    meta = CATEGORY_META.get(cat)
    if not meta:
        print(f"ERROR: Unknown category '{cat}'.")
        print(f"Supported: {', '.join(CATEGORY_META)}")
        sys.exit(1)

    display = meta["display"]
    prefix  = meta["prefix"]
    images_dir, labels_dir, csv_path, report_path = _dataset_paths(cat)

    print("=" * 65)
    print(f"LifeVault Dataset Preparation — {display}")
    print(f"Category : {cat}")
    print(f"Images   : {images_dir}")
    print(f"Labels   : {labels_dir}")
    print("=" * 65)

    # Load prelabeler plugin
    try:
        prelabeler = get_prelabeler(cat)
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Step 1: copy source files (if --source-dir provided)
    if args.source_dir:
        if not os.path.isdir(args.source_dir):
            print(f"ERROR: Source directory not found: {args.source_dir}")
            sys.exit(1)
        records = copy_and_rename(args.source_dir, images_dir, prefix)
        aw.write_selected_files_csv(records, csv_path)
        print(f"\n[DONE] CSV manifest written: {csv_path}")

    # Step 2: OCR + prelabel
    stats = process_files(images_dir, labels_dir, prefix, display, prelabeler, args.limit)

    # Step 3: Report
    ok    = sum(1 for s in stats if s["status"] == "ok")
    total = sum(s["token_count"] for s in stats)
    print(f"\n{'='*65}")
    print(f"Complete: {ok}/{len(stats)} files, {total:,} total tokens")
    print(f"{'='*65}\n")

    aw.generate_report(stats, report_path, doc_type=display,
                       tool_name="tools/prepare_dataset.py")

    # Step 4: optional spot-check
    if args.verify > 0:
        verify_annotations(labels_dir, images_dir, args.verify)

    print("\nNext step: python training/validate_dataset.py")


if __name__ == "__main__":
    main()
