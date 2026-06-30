"""
Stage 4 — Document Classification
Rule-based classifier using OCR text + extracted fields.
Extraction runs first (Stage 3) to provide richer input.
"""
import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Keyword rules: (document_type, [keywords], weight, min_unique_matches)
_RULES = [
    ("Aadhaar Card",       ["aadhaar", "aadhar", "uidai", "आधार", "unique identification authority"],                       10, 1),
    ("PAN Card",           ["permanent account number", "pan card", "pan no", "pan number"],                                10, 1),
    ("Passport",           ["passport", "passport no"],                                                                     10, 1),
    ("Driving License",    ["driving licence", "driving license", "d.l. no", "d.l. number"],                                 9, 1),
    ("Voter ID",           ["election commission", "voter id", "voter card", "electoral photo", "epic no"],                  9, 1),
    ("Birth Certificate",  ["birth certificate", "registrar of births", "certificate of birth", "birth registration"],        9, 1),
    ("Resume",             ["resume", "curriculum vitae", "cv", "technical skills", "projects", "education", "experience", 
                            "internship", "certifications", "objective", "profile", "github", "linkedin", "email", "phone",
                            "skills", "contact", "work experience", "mobile"], 9, 3),
    ("Degree Certificate", ["degree certificate", "awarded the degree", "bachelor of", "master of", "doctor of", "diploma"], 8, 1),
    ("Educational Certificate", ["educational certificate", "school certificate", "board examination", "passing certificate", 
                                 "provisional certificate", "transcript of records", "academic transcript"],                8, 1),
    ("Internship Certificate", ["internship certificate", "certificate of internship", "internship completion", 
                                "internship training", "completed internship", "as an intern"],                              8, 2),
    ("Employment Document", ["employment contract", "offer letter", "appointment letter", "employment certificate", 
                             "salary certificate", "joining letter", "experience letter"],                                   8, 2),
    ("Medical Report",     ["medical report", "prescription", "lab report", "clinical summary", "patient name", 
                            "blood test", "diagnostic report", "medical history"],                                           8, 2),
    ("Insurance Document", ["insurance policy", "policy schedule", "insurance premium", "insurance certificate", 
                            "life insurance", "health insurance", "motor insurance"],                                       8, 2),
    ("Invoice",            ["invoice", "tax invoice", "total amount due", "bill to", "payment receipt"],                     8, 1),
    ("Warranty Card",      ["warranty card", "warranty period", "product warranty", "guarantee card", 
                            "warranty void", "year warranty", "months warranty"],                                            8, 2),
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
