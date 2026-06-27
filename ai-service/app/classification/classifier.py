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
    ("Aadhaar Card",       ["aadhaar", "uid", "unique identification", "uidai", "आधार"],                                    10),
    ("PAN Card",           ["permanent account number", "income tax", "pan", "govt. of india"],                               10),
    ("Passport",           ["passport", "republic of india", "passport no", "nationality", "place of birth"],                 10),
    ("Driving License",    ["driving licence", "driving license", "d.l. no", "motor vehicles", "transport"],                   9),
    ("Voter ID",           ["election commission", "voter", "electoral", "epic no"],                                           9),
    ("Birth Certificate",  ["birth certificate", "date of birth", "place of birth", "registrar of births"],                   9),
    ("Degree Certificate", ["degree", "bachelor", "master", "doctorate", "university", "awarded the degree"],                  8),
    ("Marksheet",          ["marksheet", "mark sheet", "result", "grade", "percentage", "semester", "examination"],            8),
    ("Bank Statement",     ["account statement", "bank statement", "opening balance", "closing balance", "transaction"],       8),
    ("Salary Slip",        ["salary slip", "pay slip", "payslip", "basic salary", "net pay", "gross salary"],                  8),
    ("Invoice",            ["invoice", "bill to", "gst", "tax invoice", "total amount due", "hsn"],                           8),
]


def classify(text: str, extracted_fields: dict) -> Tuple[str, float]:
    """
    Classify the document type.
    Returns (document_type, confidence 0-1).
    """
    text_lower = text.lower()
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
