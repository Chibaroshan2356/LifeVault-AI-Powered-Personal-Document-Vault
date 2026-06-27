"""
Stage 3 — Information Extraction (runs BEFORE classification)
Rule-based regex extraction from OCR text.
Extracted fields enrich the classifier in Stage 4.
"""
import re
import logging
from typing import Optional, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

# Date patterns
_DATE_PATTERNS = [
    r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b',
    r'\b(\d{2}[/-]\d{2}[/-]\d{2})\b',
    r'\b(\d{4}[/-]\d{2}[/-]\d{2})\b',
    r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b',
    r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b',
]

_ID_PATTERNS = {
    "aadhaar":  r'\b(\d{4}\s?\d{4}\s?\d{4})\b',
    "pan":      r'\b([A-Z]{5}\d{4}[A-Z]{1})\b',
    "passport": r'\b([A-Z]\d{7})\b',
    "generic":  r'\b(?:No\.?|Number|Reg\.?|ID)[:\s]*([A-Z0-9/-]{5,20})\b',
}

_EXPIRY_KEYWORDS = r'(?:expiry|expiration|valid\s+(?:upto?|till|through|until)|date\s+of\s+expiry)'
_ISSUE_KEYWORDS  = r'(?:issue\s+date|date\s+of\s+issue|issued\s+on|d\.?o\.?i\.?)'
_NAME_KEYWORDS   = r'(?:name|holder|candidate|bearer|sri\.?|mr\.?|mrs\.?|ms\.?|dr\.?)\s*:?\s*'
_ORG_KEYWORDS    = r'(?:issued?\s+by|organization|organisation|institute|university|college|board|government\s+of)'


def extract(text: str) -> Dict[str, Optional[str]]:
    """
    Extract structured fields from raw OCR text.
    Returns a dict with null values for unfound fields.
    """
    result = {
        "documentName":       _extract_title(text),
        "holderName":         _extract_name(text),
        "organization":       _extract_org(text),
        "issueDate":          _extract_date_by_keyword(text, _ISSUE_KEYWORDS),
        "expiryDate":         _extract_date_by_keyword(text, _EXPIRY_KEYWORDS),
        "documentNumber":     _extract_document_number(text),
    }
    logger.debug(f"Extraction result: {result}")
    return result


def _extract_title(text: str) -> Optional[str]:
    """Extract document title — usually the first non-empty capitalized line."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # Look for lines that are mostly uppercase (typical for document titles)
    for line in lines[:6]:
        clean = re.sub(r'[^A-Za-z\s]', '', line).strip()
        if len(clean) > 4 and clean == clean.upper() and len(clean.split()) >= 2:
            return clean.title()
    return lines[0] if lines else None


def _extract_name(text: str) -> Optional[str]:
    """Extract holder name from common name patterns."""
    # Pattern: "Name: John Doe" or "Holder: John Doe"
    m = re.search(
        _NAME_KEYWORDS + r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
        text, re.IGNORECASE
    )
    if m:
        return m.group(1).strip()

    # Pattern: all-caps name (common in Indian documents)
    m = re.search(r'\n([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\n', text)
    if m:
        name = m.group(1).strip()
        if len(name) < 50:
            return name.title()

    return None


def _extract_org(text: str) -> Optional[str]:
    """Extract issuing organization."""
    m = re.search(
        _ORG_KEYWORDS + r'[:\s]+([A-Z][A-Za-z\s,\.]{3,60})',
        text, re.IGNORECASE
    )
    if m:
        org = m.group(1).strip().rstrip(',.')
        if len(org) > 3:
            return org
    return None


def _extract_date_by_keyword(text: str, keyword_pattern: str) -> Optional[str]:
    """Find a date that appears near a keyword."""
    # Search for keyword followed by a date within 60 chars
    combined = keyword_pattern + r'[:\s/]*' + r'(' + '|'.join(
        p.lstrip(r'\b').rstrip(r'\b') for p in _DATE_PATTERNS
    ) + r')'
    m = re.search(combined, text, re.IGNORECASE)
    if m:
        raw = m.group(1)
        return _normalise_date(raw)

    # Fallback: find any date near the keyword
    m = re.search(keyword_pattern, text, re.IGNORECASE)
    if m:
        snippet = text[m.start():m.start() + 80]
        for pat in _DATE_PATTERNS:
            dm = re.search(pat, snippet, re.IGNORECASE)
            if dm:
                return _normalise_date(dm.group(1))

    return None


def _extract_document_number(text: str) -> Optional[str]:
    """Extract any document/ID/registration number."""
    for _name, pattern in _ID_PATTERNS.items():
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _normalise_date(raw: str) -> Optional[str]:
    """Attempt to normalise a raw date string to ISO 8601 format."""
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d",
        "%d/%m/%y", "%d-%m-%y",
        "%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y",
        "%d %b. %Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(raw.strip(), fmt)
            return dt.strftime("%Y-%m-%dT00:00:00.000Z")
        except ValueError:
            continue
    return raw  # return as-is if can't parse
