"""
Stage 4 — Document Classification
Rule-based classifier using OCR text + extracted fields.
Extraction runs first (Stage 3) to provide richer input.
"""
import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Keyword rules: (document_type, [keywords], weight)
_RULES = [
    ("Aadhaar Card",       ["aadhaar", "aadhar", "uidai", "आधार", "unique identification authority"],                       10),
    ("PAN Card",           ["permanent account number", "pan card", "pan no", "pan number"],                                10),
    ("Passport",           ["passport", "passport no"],                                                                     10),
    ("Driving License",    ["driving licence", "driving license", "d.l. no", "d.l. number"],                                 9),
    ("Voter ID",           ["election commission", "voter id", "voter card", "electoral photo", "epic no"],                  9),
    ("Birth Certificate",  ["birth certificate", "registrar of births", "certificate of birth", "birth registration"],        9),
    ("Degree Certificate", ["degree certificate", "awarded the degree", "bachelor of", "master of", "doctor of", "diploma"], 8),
    ("Marksheet",          ["marksheet", "mark sheet", "statement of marks", "grade card", "grade sheet", "gradesheet", "transcript"], 8),
    ("Bank Statement",     ["account statement", "bank statement", "opening balance", "closing balance", "statement period"], 8),
    ("Salary Slip",        ["salary slip", "pay slip", "payslip", "basic salary", "net pay", "gross salary"],                  8),
    ("Invoice",            ["invoice", "tax invoice", "total amount due", "bill to"],                                         8),
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

    for doc_type, keywords, weight in _RULES:
        score = 0
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                score += weight
        if score > 0:
            scores[doc_type] = score

    if not scores:
        return "Other", 0.3

    best_type  = max(scores, key=lambda k: scores[k])
    best_score = scores[best_type]
    total      = sum(scores.values())
    confidence = round(min(best_score / max(total, 1), 1.0), 3)

    logger.info(f"Classification: {best_type} (confidence={confidence})")
    return best_type, confidence
