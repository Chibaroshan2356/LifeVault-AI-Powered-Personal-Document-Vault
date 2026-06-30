"""
Stage 4 — Document Classification
Rule-based classifier using OCR text + extracted fields.
Extraction runs first (Stage 3) to provide richer input.
"""
import re
import os
import json
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Load classification rules from configuration file rules.json
_RULES = []
try:
    _rules_path = os.path.join(os.path.dirname(__file__), "rules.json")
    with open(_rules_path, "r", encoding="utf-8") as f:
        _loaded_rules = json.load(f)
        for rule in _loaded_rules:
            _RULES.append((
                rule["category"],
                rule["keywords"],
                rule["weight"],
                rule["min_unique_matches"]
            ))
except Exception as e:
    logger.error(f"Failed to load classification rules from rules.json: {e}", exc_info=True)
    # Fallback rules in case loading fails (minimal set)
    _RULES = [
        ("Aadhaar Card",       ["aadhaar", "aadhar", "uidai", "आधार"], 10, 1),
        ("PAN Card",           ["permanent account number", "pan card", "pan no"], 10, 1),
        ("Passport",           ["passport"], 10, 1),
        ("Resume",             ["resume", "cv", "education", "experience"], 9, 2),
        ("Fee Receipt",        ["fee receipt", "tuition fee", "receipt"], 9, 2),
    ]


def classify(text: str, extracted_fields: dict) -> Tuple[str, float]:
    """
    Classify the document type.
    Returns (document_type, confidence 0-1).
    """
    # Focus on the first 4000 characters (roughly 1-2 pages) to prevent false positives
    # in long documents (like research articles, books, or reports).
    text_lower = text[:4000].lower()
    scores: dict[str, int] = {}

    for doc_type, keywords, weight, min_unique_matches in _RULES:
        matched_count = 0
        score = 0
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                matched_count += 1
                score += weight
        if matched_count >= min_unique_matches:
            scores[doc_type] = score

    if not scores:
        return "Other", 0.3

    best_type  = max(scores, key=lambda k: scores[k])
    best_score = scores[best_type]
    total      = sum(scores.values())
    confidence = round(min(best_score / max(total, 1), 1.0), 3)

    logger.info(f"Classification: {best_type} (confidence={confidence})")
    return best_type, confidence
