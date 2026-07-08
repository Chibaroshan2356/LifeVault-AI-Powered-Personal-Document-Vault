"""
tools/annotation_writer.py
==========================
Shared utilities for building LayoutLMv3 annotation JSON files and
generating pre-label Markdown reports.

Public API:
  build_annotation(category, filename, tokens, pw, ph) -> dict
  write_annotation(annotation, label_path) -> None
  write_selected_files_csv(records, csv_path) -> None
  generate_report(stats, report_path, doc_type, tool_name) -> None
"""

import csv
import json
import os
from collections import defaultdict
from datetime import datetime


# ── Annotation builder ────────────────────────────────────────────────────────

def build_annotation(
    category: str,
    filename: str,
    tokens: list[dict],
    page_width: int,
    page_height: int,
) -> dict:
    """
    Build a LayoutLMv3-compatible annotation JSON dict.

    Args:
        category:     Document category string (e.g. "Resume", "Certificate").
        filename:     Source filename (e.g. "resume_001.pdf").
        tokens:       List of {"text", "box", "label"} dicts.
        page_width:   Width of the source image/page in pixels.
        page_height:  Height of the source image/page in pixels.

    Returns:
        dict compatible with dataset/schema.json
    """
    # Canonical image filename is always .png
    base   = os.path.splitext(filename)[0]
    img_fn = base + ".png"

    return {
        "document_metadata": {
            "category": category,
        },
        "image_filename":   img_fn,
        "image_dimensions": [page_width, page_height],
        "words":            tokens,
    }


def write_annotation(annotation: dict, label_path: str) -> None:
    """Serialize and write an annotation dict to a JSON file."""
    with open(label_path, "w", encoding="utf-8") as f:
        json.dump(annotation, f, ensure_ascii=False, indent=2)


# ── CSV manifest writer ───────────────────────────────────────────────────────

def write_selected_files_csv(records: list[dict], csv_path: str) -> None:
    """
    Write a CSV manifest of selected/copied files.

    Each record must have keys: original_path, original_filename, new_filename.
    """
    fieldnames = ["original_path", "original_filename", "new_filename"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


# ── Pre-label report generator ────────────────────────────────────────────────

def generate_report(
    stats: list[dict],
    report_path: str,
    doc_type: str = "Document",
    tool_name: str = "tools/prepare_dataset.py",
) -> None:
    """
    Generate a Markdown pre-label quality report.

    Args:
        stats:       List of per-file stat dicts from the pipeline.
        report_path: Output path for the .md file.
        doc_type:    Human-readable document category (e.g. "Resume", "Certificate").
        tool_name:   Name of the tool that generated this report.
    """
    total        = len(stats)
    processed_ok = sum(1 for s in stats if s["status"] == "ok")
    total_tokens = sum(s.get("token_count", 0) for s in stats)

    label_freq: dict[str, int] = defaultdict(int)
    for s in stats:
        for lbl, cnt in s.get("label_counts", {}).items():
            label_freq[lbl] += cnt

    o_count  = label_freq.get("O", 0)
    ne_count = total_tokens - o_count
    ne_pct   = round(ne_count / total_tokens * 100, 1) if total_tokens else 0.0

    lines = [
        f"# {doc_type} Dataset Pre-label Report",
        f"\n> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"> Tool: `{tool_name}`\n",
        "---\n",
        "## Summary\n",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Total {doc_type}s Processed | {processed_ok}/{total} |",
        f"| Total OCR Tokens | {total_tokens:,} |",
        f"| Auto-labelled Entities (non-O) | {ne_count:,} ({ne_pct}%) |",
        f"| Remaining O Tokens | {o_count:,} ({100 - ne_pct:.1f}%) |",
        "",
        "> [!NOTE]",
        "> A high proportion of `O` tokens is normal at this stage.",
        "> The pre-labeler prioritizes precision. Manual review is required",
        "> to complete ground-truth annotations before training.\n",
        "---\n",
        "## Entity Label Frequency\n",
        "| Label | Count |",
        "|-------|-------|",
    ]

    for lbl, cnt in sorted(label_freq.items(), key=lambda x: -x[1]):
        lines.append(f"| `{lbl}` | {cnt:,} |")

    lines += [
        "",
        "---\n",
        f"## Per-Document Summary\n",
        "| File | Tokens | Entities | O Tokens | OCR Method | Status |",
        "|------|--------|----------|----------|------------|--------|",
    ]

    for s in stats:
        tc  = s.get("token_count", 0)
        lc  = s.get("label_counts", {})
        o   = lc.get("O", 0)
        ne  = tc - o
        mth = s.get("method", "N/A")
        st  = "OK" if s["status"] == "ok" else f"FAILED: {s.get('error', '')}"
        lines.append(f"| `{s['filename']}` | {tc} | {ne} | {o} | {mth} | {st} |")

    lines += [
        "",
        "---\n",
        "## Validation\n",
        "Run the dataset validator to confirm all JSONs pass schema checks:\n",
        "```powershell",
        "python training/validate_dataset.py",
        "```\n",
        "---\n",
        "## Next Steps\n",
        f"1. Review pre-labeled JSONs in `dataset/{doc_type.lower()}/labels/` manually.",
        "2. Correct mis-labeled or missed entities.",
        "3. Run `python training/validate_dataset.py` to confirm 0 errors.",
        "4. Once ground-truth annotations are complete, proceed to Colab training.",
    ]

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[DONE] Report written: {report_path}")
