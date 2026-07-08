"""
tools/build_resume_labels.py
============================
Backward-compatible thin wrapper for the Phase 4A resume pipeline.

All logic now lives in:
  - tools/ocr_pipeline.py
  - tools/annotation_writer.py
  - tools/prelabel/resume.py
  - tools/prepare_dataset.py   ← generic entry point

This file is kept for backward compatibility.
You can still run:
    python tools/build_resume_labels.py [--limit N] [--verbose] [--verify N]

Or use the generic runner directly:
    python tools/prepare_dataset.py --category resume [--limit N] [--verify N]
"""

import sys
import os

# Ensure tools/ is on sys.path for sibling imports
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# Delegate entirely to prepare_dataset with --category resume injected
if __name__ == "__main__":
    # Inject --category resume if not already present
    if "--category" not in sys.argv:
        sys.argv.insert(1, "--category")
        sys.argv.insert(2, "resume")

    # Run prepare_dataset main
    import prepare_dataset
    prepare_dataset.main()
