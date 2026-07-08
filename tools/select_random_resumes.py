"""
tools/select_random_resumes.py
==============================
Phase 4A – Step 1: Randomly select 50 PDF resumes from the Kaggle dataset,
copy them to dataset/resume/images/ with sequential naming, and write a CSV manifest.

Usage:
    python tools/select_random_resumes.py --source-dir "C:\\path\\to\\kaggle\\resumes"
    python tools/select_random_resumes.py --source-dir "C:\\path\\to\\kaggle\\resumes" --seed 42 --count 50

Outputs:
    dataset/resume/images/resume_001.pdf ... resume_050.pdf
    dataset/resume/selected_files.csv
"""

import os
import sys
import csv
import random
import shutil
import argparse
import glob
from datetime import datetime


# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT    = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
IMAGES_DIR   = os.path.join(REPO_ROOT, "dataset", "resume", "images")
CSV_PATH     = os.path.join(REPO_ROOT, "dataset", "resume", "selected_files.csv")


def find_all_pdfs(source_dir: str) -> list[str]:
    """Recursively find all PDF files under source_dir."""
    pattern = os.path.join(source_dir, "**", "*.pdf")
    pdfs    = glob.glob(pattern, recursive=True)
    # Also check direct .PDF uppercase
    pattern_upper = os.path.join(source_dir, "**", "*.PDF")
    pdfs += glob.glob(pattern_upper, recursive=True)
    return sorted(set(pdfs))


def select_and_copy(source_dir: str, count: int = 50, seed: int = 42) -> list[dict]:
    """Select `count` random PDFs, copy them, return manifest records."""

    all_pdfs = find_all_pdfs(source_dir)

    if not all_pdfs:
        print(f"ERROR: No PDF files found in: {source_dir}")
        sys.exit(1)

    print(f"Found {len(all_pdfs)} PDF files in source directory.")

    if len(all_pdfs) < count:
        print(f"WARNING: Only {len(all_pdfs)} PDFs available, selecting all.")
        count = len(all_pdfs)

    random.seed(seed)
    selected = random.sample(all_pdfs, count)
    selected.sort()  # deterministic ordering after sampling

    # Ensure output directory exists
    os.makedirs(IMAGES_DIR, exist_ok=True)

    # Remove existing placeholder .gitkeep (optional, keep it if present)
    records = []
    for idx, src_path in enumerate(selected, start=1):
        new_filename = f"resume_{idx:03d}.pdf"
        dst_path     = os.path.join(IMAGES_DIR, new_filename)

        shutil.copy2(src_path, dst_path)

        records.append({
            "original_path":     src_path,
            "original_filename": os.path.basename(src_path),
            "new_filename":      new_filename,
        })

        print(f"  Copied [{idx:3d}/{count}]: {os.path.basename(src_path)} -> {new_filename}")

    return records


def write_csv(records: list[dict]) -> None:
    """Write the selection manifest CSV."""
    fieldnames = ["original_path", "original_filename", "new_filename"]
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"\n[DONE] Manifest written: {CSV_PATH}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Randomly select PDFs from a Kaggle resume dataset folder."
    )
    parser.add_argument(
        "--source-dir", required=True,
        help="Path to the root folder of the Kaggle Resume Dataset."
    )
    parser.add_argument(
        "--count", type=int, default=50,
        help="Number of resumes to select (default: 50)."
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)."
    )

    args = parser.parse_args()

    if not os.path.isdir(args.source_dir):
        print(f"ERROR: Source directory not found: {args.source_dir}")
        sys.exit(1)

    print("=" * 65)
    print("LifeVault Phase 4A - Resume Selector")
    print(f"Source  : {args.source_dir}")
    print(f"Target  : {IMAGES_DIR}")
    print(f"Count   : {args.count}")
    print(f"Seed    : {args.seed}")
    print("=" * 65)

    records = select_and_copy(args.source_dir, count=args.count, seed=args.seed)
    write_csv(records)

    print(f"\nSummary: {len(records)} resumes copied to {IMAGES_DIR}")
    print("Next step: python tools/build_resume_labels.py")


if __name__ == "__main__":
    main()
