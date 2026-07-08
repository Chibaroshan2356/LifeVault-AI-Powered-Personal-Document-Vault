"""
tools/select_random_student_ids.py
==================================
Randomly select exactly 100 Student ID cards from a source directory or a ZIP file,
copy/extract them to dataset/student_id/images/ with sequential renaming,
and write the dataset/student_id/selected_files.csv manifest.

Usage:
    python tools/select_random_student_ids.py --source "C:\\Users\\Prathiksha\\Downloads\\archive (4).zip"
    python tools/select_random_student_ids.py --source "C:\\Users\\Prathiksha\\Downloads\\archive (4).zip" --seed 42 --count 100
"""

import os
import sys
import csv
import random
import zipfile
import shutil
import argparse
from datetime import datetime

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT  = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
IMAGES_DIR = os.path.join(REPO_ROOT, "dataset", "student_id", "images")
CSV_PATH   = os.path.join(REPO_ROOT, "dataset", "student_id", "selected_files.csv")

SUPPORTED_EXTS = {".pdf", ".png", ".jpg", ".jpeg"}


def sample_from_zip(zip_path: str, count: int, seed: int) -> list[dict]:
    """Sample from a ZIP archive directly, extracting only selected files."""
    print(f"Reading from ZIP archive: {zip_path}")
    with zipfile.ZipFile(zip_path, 'r') as z:
        # Find all supported files inside the ZIP
        all_files = []
        for name in z.namelist():
            ext = os.path.splitext(name)[1].lower()
            if ext in SUPPORTED_EXTS and not name.startswith("__MACOSX"):
                all_files.append(name)

        all_files.sort()
        total_found = len(all_files)
        print(f"Found {total_found} candidate files in ZIP.")

        if total_found == 0:
            print("ERROR: No supported files found in ZIP archive.")
            sys.exit(1)

        actual_count = min(count, total_found)
        random.seed(seed)
        selected = random.sample(all_files, actual_count)
        selected.sort()  # deterministic output naming

        os.makedirs(IMAGES_DIR, exist_ok=True)
        records = []

        for idx, zip_member in enumerate(selected, start=1):
            ext = os.path.splitext(zip_member)[1].lower()
            new_filename = f"student_id_{idx:03d}{ext}"
            dst_path = os.path.join(IMAGES_DIR, new_filename)

            # Extract the single file
            with z.open(zip_member) as source_file, open(dst_path, "wb") as target_file:
                shutil.copyfileobj(source_file, target_file)

            records.append({
                "original_path":     zip_path,
                "original_filename": os.path.basename(zip_member),
                "new_filename":      new_filename,
            })
            print(f"  Extracted [{idx:3d}/{actual_count}]: {zip_member} -> {new_filename}")

        return records


def sample_from_dir(dir_path: str, count: int, seed: int) -> list[dict]:
    """Sample from a directory recursively."""
    print(f"Reading from directory: {dir_path}")
    all_files = []
    for root, _, files in os.walk(dir_path):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in SUPPORTED_EXTS:
                all_files.append(os.path.join(root, f))

    all_files.sort()
    total_found = len(all_files)
    print(f"Found {total_found} candidate files in directory.")

    if total_found == 0:
        print(f"ERROR: No supported files found in: {dir_path}")
        sys.exit(1)

    actual_count = min(count, total_found)
    random.seed(seed)
    selected = random.sample(all_files, actual_count)
    selected.sort()

    os.makedirs(IMAGES_DIR, exist_ok=True)
    records = []

    for idx, src_path in enumerate(selected, start=1):
        ext = os.path.splitext(src_path)[1].lower()
        new_filename = f"student_id_{idx:03d}{ext}"
        dst_path = os.path.join(IMAGES_DIR, new_filename)

        shutil.copy2(src_path, dst_path)

        records.append({
            "original_path":     src_path,
            "original_filename": os.path.basename(src_path),
            "new_filename":      new_filename,
        })
        print(f"  Copied [{idx:3d}/{actual_count}]: {os.path.basename(src_path)} -> {new_filename}")

    return records


def main():
    parser = argparse.ArgumentParser(description="Sample exactly 100 student ID files.")
    parser.add_argument("--source", required=True, help="Path to ZIP archive or directory containing student ID cards.")
    parser.add_argument("--count", type=int, default=100, help="Number of files to sample.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for sampling.")
    args = parser.parse_args()

    source = args.source
    if not os.path.exists(source):
        print(f"ERROR: Source path does not exist: {source}")
        sys.exit(1)

    if os.path.isdir(source):
        records = sample_from_dir(source, args.count, args.seed)
    elif zipfile.is_zipfile(source):
        records = sample_from_zip(source, args.count, args.seed)
    else:
        print(f"ERROR: Source path is neither a directory nor a valid ZIP file: {source}")
        sys.exit(1)

    # Write selection CSV manifest
    fieldnames = ["original_path", "original_filename", "new_filename"]
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"\n[DONE] Manifest written to: {CSV_PATH}")
    print(f"Successfully sampled {len(records)} student ID cards into {IMAGES_DIR}")


if __name__ == "__main__":
    main()
