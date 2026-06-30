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


def _extract_resume_candidate_name(text: str) -> Optional[str]:
    """Extract candidate name from the top lines of a Resume."""
    # Candidates for name are typically in the first 4 lines of text
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    for line in lines[:4]:
        # Remove any email addresses, phone numbers, or URLs first
        clean_line = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', line)
        clean_line = re.sub(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', '', clean_line)
        clean_line = re.sub(r'https?://\S+|www\.\S+', '', clean_line)
        # Keep only letters, dots, and spaces
        clean_line = re.sub(r'[^a-zA-Z\s\.]', '', clean_line).strip()
        
        words = clean_line.split()
        if 2 <= len(words) <= 4:
            if all((len(w) >= 2 or w.isupper()) and w[0].isupper() for w in words):
                joined = " ".join(words).lower()
                # Skip resume-related terms/headings
                if not any(x in joined for x in ["resume", "curriculum", "vitae", "summary", "profile", "contact", "address", "phone", "email"]):
                    return " ".join(words).title()
    return None


def _extract_resume_org(text: str) -> Optional[str]:
    """Extract corporate company or educational college/university from a Resume."""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    org_patterns = [
        # College/University indicators
        r'\b[A-Za-z0-9\s,\.\(\)\-]+ (?:University|College|Institute|School|Academy|IIT|NIT|KEC)\b',
        r'\b(?:University|College|Institute|School|Academy) of [A-Za-z0-9\s,\.\(\)\-]+\b',
        # Company indicators
        r'\b[A-Za-z0-9\s,\.\(\)\-]+ (?:Pvt\.? Ltd\.?|Private Limited|Ltd\.?|Limited|Inc\.?|Corp\.?|Corporation|Solutions|Technologies|Consultancy)\b'
    ]
    
    prepositions = [" at ", " from ", " in "]
    
    for line in lines[:20]:  # Limit to top 20 lines to prevent grabbing random text
        # Skip lines that look like objectives/profiles to avoid false positives
        if any(keyword in line.lower() for keyword in ["objective", "profile", "summary"]):
            continue
            
        # Try to find preposition first to isolate organization
        for prep in prepositions:
            if prep in line.lower():
                parts = re.split(prep, line, flags=re.IGNORECASE)
                if len(parts) > 1:
                    candidate = parts[-1].strip()
                    for pattern in org_patterns:
                        m = re.search(pattern, candidate, re.IGNORECASE)
                        if m:
                            org = m.group(0).strip()
                            org = re.sub(r'^[,\.\-\s]+|[,\.\-\s]+$', '', org).strip()
                            if 2 <= len(org.split()) <= 7:
                                return org.title()
                                
        # Fallback: check the entire line
        for pattern in org_patterns:
            m = re.search(pattern, line, re.IGNORECASE)
            if m:
                org = m.group(0).strip()
                org = re.sub(r'^[,\.\-\s]+|[,\.\-\s]+$', '', org).strip()
                if 2 <= len(org.split()) <= 7:
                    return org.title()
                    
    return None


def extract_resume_metadata(text: str, default_metadata: dict) -> dict:
    """
    Extract structured fields optimized specifically for Resume documents.
    Overrides generic extraction for Holder, Document and Organization.
    """
    holder = _extract_resume_candidate_name(text) or default_metadata.get("holderName")
    org = _extract_resume_org(text)
    
    return {
        "documentName":   "Resume",
        "holderName":     holder,
        "organization":   org,
        "issueDate":      None,
        "expiryDate":     None,
        "documentNumber": None,
    }


def _is_valid_person_name(name: str) -> bool:
    if not name:
        return False
    name_lower = name.lower()
    invalid_keywords = [
        "college", "university", "institute", "school", "engineering", 
        "technology", "receipt", "fee", "payment", "amount", "rupees", "rs.", "rs", 
        "date", "class", "branch", "degree", "semester", "year", "total", "paid", 
        "signature", "cashier", "challan", "bank", "no.", "number", "id", "register", 
        "roll", "admission", "office", "copy", "original", "student", "candidate", "kec"
    ]
    for kw in invalid_keywords:
        if kw in name_lower:
            return False
    # A person name should typically be between 2 and 40 characters
    if not (2 <= len(name.strip()) <= 40):
        return False
    return True


def _extract_fee_receipt_org(text: str) -> Optional[str]:
    # Search for lines containing university, college, institute, school, academy
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    org_indicators = ["university", "college", "institute", "school", "academy", "kec", "polytechnic"]
    for line in lines[:10]: # Check first 10 lines
        line_lower = line.lower()
        if any(ind in line_lower for ind in org_indicators):
            # Check if it doesn't contain fee/receipt/payment/challan keywords
            if not any(kw in line_lower for kw in ["receipt", "fee", "payment", "challan"]):
                # Clean it up: keep letters, numbers, spaces, and common symbols
                clean = re.sub(r'[^A-Za-z0-9\s\&\.\-]', '', line).strip()
                if 5 <= len(clean) <= 100:
                    return clean.title()
    return None


def _extract_fee_receipt_number(text: str) -> Optional[str]:
    id_labels = [
        r'register\s+no\.?', r'register\s+number', r'reg\.?\s*no\.?', r'reg\.?\s*number',
        r'roll\s+no\.?', r'roll\s+number',
        r'student\s+id', r'student\s+no\.?', r'student\s+number',
        r'admission\s+no\.?', r'admission\s+number',
        r'receipt\s+no\.?', r'receipt\s+number',
        r'challan\s+no\.?', r'challan\s+number',
        r'transaction\s+id', r'ref\s+no\.?', r'reference\s+no\.?'
    ]
    
    for label in id_labels:
        pattern = r'\b' + label + r'[:\s\-–—]+([A-Z0-9/\-]{4,25})\b'
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
            
    # Standalone student ID pattern (e.g. 23ITR047)
    m = re.search(r'\b(\d{2}[A-Z]{2,3}\d{3,4})\b', text)
    if m:
        return m.group(1).strip()
        
    return None


def _extract_fee_receipt_date(text: str) -> Optional[str]:
    # Search for date labels near dates
    date_labels = r'(?:date|payment\s+date|transaction\s+date|receipt\s+date)'
    return _extract_date_by_keyword(text, date_labels)


def extract_fee_receipt_metadata(text: str, default_metadata: dict) -> dict:
    """
    Extract structured fields optimized specifically for Fee Receipt documents.
    Overrides generic extraction for Holder, Document, and Organization.
    """
    doc_name = "Fee Receipt"
    
    # Extract holder (student name)
    holder = None
    # Try explicit labels first
    name_patterns = [
        r'(?:student\s+name|candidate\s+name|name\s+of\s+student|name\s+of\s+the\s+student|student|candidate)\s*[:\-–—\s]\s*([A-Za-z][A-Za-z\ \.]+)',
        r'\b(?:name)\s*[:\-–—]\s*([A-Za-z][A-Za-z\ \.]+)'
    ]
    for pattern in name_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            if _is_valid_person_name(candidate):
                holder = candidate.title()
                break
                
    # Adjacent-line heuristic if roll number / student ID is present
    if not holder:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for idx, line in enumerate(lines):
            if re.search(r'\b(\d{2}[A-Z]{2,3}\d{3,4})\b', line) or any(kw in line.lower() for kw in ["roll no", "register no", "reg no", "admission no"]):
                # Check line below
                if idx + 1 < len(lines):
                    candidate = lines[idx+1]
                    candidate_clean = re.sub(r'[^A-Za-z\ \.]', '', candidate).strip()
                    if _is_valid_person_name(candidate_clean) and len(candidate_clean.split()) >= 2:
                        holder = candidate_clean.title()
                        break
                # Check line above
                if idx - 1 >= 0:
                    candidate = lines[idx-1]
                    candidate_clean = re.sub(r'[^A-Za-z\ \.]', '', candidate).strip()
                    if _is_valid_person_name(candidate_clean) and len(candidate_clean.split()) >= 2:
                        holder = candidate_clean.title()
                        break
                        
    # Fallback to default holder name if it passes validation
    if not holder:
        default_holder = default_metadata.get("holderName")
        if default_holder and _is_valid_person_name(default_holder):
            holder = default_holder

    org = _extract_fee_receipt_org(text) or default_metadata.get("organization")
    doc_num = _extract_fee_receipt_number(text) or default_metadata.get("documentNumber")
    issue_date = _extract_fee_receipt_date(text) or default_metadata.get("issueDate")
    
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      issue_date,
        "expiryDate":     None,  # Fee receipts do not expire
        "documentNumber": doc_num,
    }
