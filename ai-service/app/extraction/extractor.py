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
    "generic":  r'\b(?:No\b\.?|Number\b|Reg\b\.?|ID\b)[:\s]*([A-Z0-9/-]{5,20})\b',
}

_EXPIRY_KEYWORDS = r'(?:expiry|expiration|valid\s+(?:upto?|till|through|until)|date\s+of\s+expiry)'
_ISSUE_KEYWORDS  = r'(?:issue\s+date|date\s+of\s+issue|issued\s+on|d\.?o\.?i\.?)'
_NAME_KEYWORDS   = r'(?:name|holder|candidate|bearer|sri\b\.?|mr\b\.?|mrs\b\.?|ms\b\.?|dr\b\.?)\s*:?\s*'
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
        _NAME_KEYWORDS + r'([A-Z][A-Za-z\s\.]{2,40})',
        text, re.IGNORECASE
    )
    if m:
        candidate = m.group(1).strip()
        if _is_valid_person_name(candidate):
            return candidate.title()

    # Pattern: all-caps name (common in Indian documents)
    for m in re.finditer(r'\n([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\n', text):
        candidate = m.group(1).strip()
        if _is_valid_person_name(candidate):
            return candidate.title()

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
    # Prioritize DL Number if present
    m_dl = re.search(r'(?:dl\s*no\.?|dl\s*number|d\.l\.\s*no\.?|licen[cs]e\s*no\.?)\s*[:\-–—\s]*([A-Z]{2}\s?\d{2}\s?[A-Z0-9\s/-]{4,15})', text, re.IGNORECASE)
    if m_dl:
        return m_dl.group(1).strip()

    for _name, pattern in _ID_PATTERNS.items():
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            # Avoid picking Badge numbers as generic ID
            if _name == "generic" and re.search(r'\bbadge\b', text[max(0, m.start()-15):m.start()], re.IGNORECASE):
                continue
            return cand
    return None


def _normalise_date(raw: str) -> Optional[str]:
    """Attempt to normalise a raw date string to ISO 8601 format."""
    if not raw:
        return None
    raw_clean = re.sub(r'\s+', '', raw.strip())
    raw_clean = re.sub(r'[^0-9A-Za-z/-]', '', raw_clean)
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d",
        "%d/%m/%y", "%d-%m-%y",
        "%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y",
        "%d %b. %Y",
    ]
    # First try the clean version without spaces
    for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d", "%d/%m/%y", "%d-%m-%y"]:
        try:
            dt = datetime.strptime(raw_clean, fmt)
            return dt.strftime("%Y-%m-%dT00:00:00.000Z")
        except ValueError:
            continue

    # Fallback to standard formats
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
    name_clean = name.strip()
    
    # A person name must not contain digits or special punctuation
    if any(c.isdigit() for c in name_clean):
        return False
    if any(c in r"()[]{}<>=+*^%$#@!~`/?\|:;\"\\" for c in name_clean):
        return False
    # Allowed characters: letters, spaces, dots, hyphens, apostrophes
    if not re.match(r"^[A-Za-z\s\.\'\-]+$", name_clean):
        return False

    name_lower = name_clean.lower()
    
    # Vehicle classes and driving licence abbreviations
    vehicle_tokens = {"lmv", "htv", "ht", "mcwg", "mcwog", "trans", "non-trans", "hgv", "psv", "cov", "badge", "dl", "nt", "tr"}
    tokens = set(re.findall(r'\b[a-z0-9-]+\b', name_lower))
    if tokens and tokens.issubset(vehicle_tokens):
        return False
    if any(vt in tokens for vt in ["lmv", "htv", "mcwg", "mcwog", "psv", "hgv", "badge"]):
        return False

    invalid_keywords = [
        "college", "university", "institute", "school", "engineering", 
        "technology", "receipt", "fee", "payment", "amount", "rupees", "rs.", "rs", 
        "date", "class", "branch", "degree", "semester", "year", "total", "paid", 
        "signature", "cashier", "challan", "bank", "no.", "number", "id", "register", 
        "roll", "admission", "office", "copy", "original", "student", "candidate", "kec",
        "company", "solutions", "limited", "ltd", "pvt", "corp", "corporation", "association",
        "group", "services", "industries", "designation", "department", "dept", "valid", "expiry", "card",
        "issued", "awarded", "presented", "certifies", "completion", "achievement", "to", "by", "for", "verify", "credential", "certified", "url", "developer",
        "licence", "license", "driving", "union of india", "blood", "rto", "son/daughter", "authority", "issuing", "salem", "tamil nadu", "highway", "nagar",
        "republic", "socialist", "vietnam", "viet nam", "vietnamese", "cong hoa", "xa hoi", "chu nghia", "ho chieu", "passport",
        "nationality", "quoc tich", "place of birth", "noi sinh", "noi cap", "cuc quan ly", "xuat nhap canh", "sex", "gender", "gioi tinh",
        "ngay sinh", "ngay cap", "date of birth", "date of issue", "date of expiry", "government", "ministry", "specimen", "state of"
    ]
    for kw in invalid_keywords:
        if kw in name_lower:
            return False
    # A person name should typically be between 2 and 50 characters
    if not (2 <= len(name_clean) <= 50):
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


def extract_identity_card_metadata(text: str, default_metadata: dict) -> dict:
    """
    Extract structured fields optimized specifically for Identity Card documents.
    Overrides generic extraction for Holder, DocumentName, Organization, and DocumentNumber.
    """
    # 1. Determine document name
    doc_name = "Identity Card"
    text_lower = text.lower()
    if "student identity card" in text_lower or "student id card" in text_lower:
        doc_name = "Student Identity Card"
    elif "employee identity card" in text_lower or "employee id card" in text_lower:
        doc_name = "Employee Identity Card"
    
    # 2. Extract holder name
    holder = None
    
    # Heuristics for relative/address lines
    def is_relative_or_address_line(line: str) -> bool:
        line_lower = line.lower()
        forbidden = [
            r'\bs/o\b', r'\bd/o\b', r'\bw/o\b', r'\bc/o\b',
            r'\bfather', r'\bmother', r'\bson\s+of', r'\bdaughter\s+of',
            r'\bwife\s+of', r'\bcare\s+of', r'\baddress'
        ]
        return any(re.search(pat, line_lower) for pat in forbidden)

    # Let's find all explicit name matches first
    name_patterns = [
        r'(?:student\s+name|employee\s+name|holder\s+name|name\s+of\s+holder|name\s+of\s+student|name\s+of\s+employee|name|holder|bearer)\s*[:\-–—\s]\s*([A-Za-z][A-Za-z\ \.]+)',
    ]
    
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        if is_relative_or_address_line(line):
            continue
        for pattern in name_patterns:
            m = re.search(pattern, line, re.IGNORECASE)
            if m:
                candidate = m.group(1).strip()
                if _is_valid_person_name(candidate):
                    holder = candidate.title()
                    break
        if holder:
            break

    # Fallback to lines that look like names if no explicit Name: label matched
    if not holder:
        for line in lines[:15]:
            if is_relative_or_address_line(line):
                continue
            words = line.split()
            if 2 <= len(words) <= 4:
                clean_line = re.sub(r'[^A-Za-z\ \.]', '', line).strip()
                if clean_line and _is_valid_person_name(clean_line) and clean_line == clean_line.upper():
                    holder = clean_line.title()
                    break

    # Fallback to default holder name if it passes validation and isn't on a relative/address line
    if not holder:
        default_holder = default_metadata.get("holderName")
        if default_holder and _is_valid_person_name(default_holder):
            is_relative_name = False
            for line in lines:
                if default_holder.lower() in line.lower() and is_relative_or_address_line(line):
                    is_relative_name = True
                    break
            if not is_relative_name:
                holder = default_holder

    # 3. Organization extraction
    org = None
    org_indicators = [
        "university", "college", "institute", "school", "academy", "polytechnic", "education",
        "pvt", "ltd", "private", "limited", "inc", "corp", "corporation", "solutions", 
        "technologies", "consultancy", "systems", "industries", "services", "software", "ventures"
    ]
    for idx, line in enumerate(lines[:10]):
        line_lower = line.lower()
        if any(ind in line_lower for ind in org_indicators):
            if not any(kw in line_lower for kw in ["name", "holder", "card", "roll", "reg", "admission", "id", "valid"]):
                clean = re.sub(r'[^A-Za-z0-9\s\&\.\-]', '', line).strip()
                if 3 <= len(clean) <= 100:
                    # Check line above (multi-line organization title heuristic)
                    if idx > 0:
                        prev_line = lines[idx - 1]
                        prev_clean = re.sub(r'[^A-Za-z0-9\s\&\.\-]', '', prev_line).strip()
                        if (prev_clean and 
                            (prev_clean[0].isupper() or prev_clean == prev_clean.upper()) and 
                            len(prev_clean) > 2 and 
                            not any(kw in prev_line.lower() for kw in ["name", "holder", "card", "roll", "reg", "admission", "id", "valid", "address"])):
                            clean = prev_clean + " " + clean
                    org = clean.title()
                    break
                    
    if not org:
        org = default_metadata.get("organization")

    # 4. Document number extraction
    doc_num = None
    id_labels = [
        r'register\s+no\.?', r'register\s+number', r'reg\.?\s*no\.?', r'reg\.?\s*number',
        r'roll\s+no\.?', r'roll\s+number',
        r'employee\s+id', r'employee\s+no\.?', r'employee\s+number', r'emp\.?\s*id', r'emp\.?\s*no\.?',
        r'student\s+id', r'student\s+no\.?', r'student\s+number',
        r'admission\s+no\.?', r'admission\s+number',
        r'card\s+no\.?', r'card\s+number',
        r'id\s+no\.?', r'id\s+number',
        r'identity\s+no\.?', r'identity\s+number'
    ]
    for label in id_labels:
        pattern = r'\b' + label + r'[:\s\-–—]+([A-Z0-9/\-]{3,25})\b'
        for m in re.finditer(pattern, text, re.IGNORECASE):
            val = m.group(1).strip()
            if val.lower() not in ["card", "number", "name", "date", "entity"]:
                doc_num = val
                break
        if doc_num:
            break
            
    # Standalone student/employee ID pattern (e.g. 23ITR047 or EMP-10243)
    if not doc_num:
        m = re.search(r'\b(\d{2}[A-Z]{2,3}\d{3,4})\b', text)
        if m:
            doc_num = m.group(1).strip()
            
    if not doc_num:
        doc_num = default_metadata.get("documentNumber")

    # Expiry/Issue Dates
    issue_date = default_metadata.get("issueDate")
    expiry_date = default_metadata.get("expiryDate")
    
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      issue_date,
        "expiryDate":     expiry_date,
        "documentNumber": doc_num,
    }


def _extract_certificate_title(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:5]:
        line_lower = line.lower()
        skip_keywords = ["issued", "awarded", "presented", "certifies", "completion", "achievement", "to:", "by:", "date:", "verify"]
        if any(kw in line_lower for kw in skip_keywords) and not any(title_kw in line_lower for title_kw in ["developer", "administrator", "engineer", "architect", "analyst", "practitioner", "specialist"]):
            continue
        clean = re.sub(r'[^A-Za-z0-9\s]', '', line).strip()
        words = clean.split()
        if len(words) >= 2 and 6 <= len(clean) <= 60:
            if all(w[0].isupper() for w in words if w.isalpha()):
                return line.strip()
            if clean == clean.upper():
                return line.strip().title()
    return _extract_title(text)


def _extract_certificate_holder(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    labels = [
        r'\bissued\s+to\b', r'\bawarded\s+to\b', r'\bpresented\s+to\b',
        r'\bthis\s+certifies\s+that\b', r'\bthis\s+is\s+to\s+certify\s+that\b',
        r'\bcertify\s+that\b', r'\bcertificate\s+of\s+(?:completion|achievement)\s+to\b'
    ]
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        for label in labels:
            if re.search(label, line_lower):
                parts = re.split(label, line, flags=re.IGNORECASE)
                if len(parts) > 1 and parts[1].strip():
                    candidate = re.sub(r'^[:\s\-–—]+|[:\s\-–—]+$', '', parts[1]).strip()
                    if _is_valid_person_name(candidate):
                        return candidate.title()
                if idx + 1 < len(lines):
                    candidate = lines[idx + 1].strip()
                    if _is_valid_person_name(candidate):
                        return candidate.title()
                if idx + 2 < len(lines):
                    candidate = lines[idx + 2].strip()
                    if _is_valid_person_name(candidate):
                        return candidate.title()
    return None


def _normalize_org_casing(org_name: str) -> str:
    org_lower = org_name.lower()
    known_orgs = {
        "mongodb": "MongoDB",
        "google": "Google",
        "microsoft": "Microsoft",
        "amazon web services": "Amazon Web Services",
        "aws": "Amazon Web Services",
        "oracle": "Oracle",
        "cisco": "Cisco",
        "freecodecamp": "freeCodeCamp",
        "coursera": "Coursera",
        "udemy": "Udemy"
    }
    for org_kw, org_val in known_orgs.items():
        if org_kw == org_lower or org_kw in org_lower:
            return org_val
    return org_name.title()


def _extract_certificate_org(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    labels = [r'\bissued\s+by\b', r'\borganization\b', r'\bcompany\b', r'\bprovided\s+by\b', r'\boffered\s+by\b']
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        for label in labels:
            if re.search(label, line_lower):
                parts = re.split(label, line, flags=re.IGNORECASE)
                if len(parts) > 1 and parts[1].strip():
                    candidate = re.sub(r'^[:\s\-–—]+|[:\s\-–—]+$', '', parts[1]).strip()
                    if 2 <= len(candidate) <= 50:
                        return _normalize_org_casing(candidate)
                if idx + 1 < len(lines):
                    candidate = lines[idx + 1].strip()
                    if 2 <= len(candidate) <= 50 and not any(kw in candidate.lower() for kw in ["url", "http", "verify"]):
                        return _normalize_org_casing(candidate)
                        
    text_lower = text.lower()
    known_orgs = {
        "mongodb": "MongoDB",
        "google": "Google",
        "microsoft": "Microsoft",
        "amazon web services": "Amazon Web Services",
        "aws": "Amazon Web Services",
        "oracle": "Oracle",
        "cisco": "Cisco",
        "freecodecamp": "freeCodeCamp",
        "coursera": "Coursera",
        "udemy": "Udemy"
    }
    for org_kw, org_name in known_orgs.items():
        if org_kw in text_lower:
            return org_name
            
    # Fallback: scan top 5 lines for indicators
    org_indicators = [
        "university", "college", "institute", "school", "academy", "polytechnic", "education",
        "pvt", "ltd", "private", "limited", "inc", "corp", "corporation", "solutions", 
        "technologies", "consultancy", "systems", "industries", "services", "software", "ventures"
    ]
    for line in lines[:5]:
        line_lower = line.lower()
        if any(ind in line_lower for ind in org_indicators):
            if not any(kw in line_lower for kw in ["name", "holder", "card", "roll", "reg", "admission", "id", "valid", "date"]):
                clean = re.sub(r'[^A-Za-z0-9\s\&\.\-]', '', line).strip()
                if 3 <= len(clean) <= 100:
                    return clean.title()

    return None


def _extract_certificate_date(text: str) -> Optional[str]:
    date_labels = r'(?:issued\s+on|issue\s+date|date\s+of\s+issue|issued|date)'
    return _extract_date_by_keyword(text, date_labels)


def extract_educational_certificate_metadata(text: str, default_metadata: dict) -> dict:
    """
    Extract structured fields optimized specifically for Educational/Professional Certificate documents.
    Overrides generic extraction for Holder, DocumentName, Organization, and IssueDate.
    """
    doc_name = _extract_certificate_title(text) or default_metadata.get("documentName") or "Educational Certificate"
    
    holder = _extract_certificate_holder(text)
    if not holder:
        default_holder = default_metadata.get("holderName")
        if default_holder and _is_valid_person_name(default_holder):
            holder = default_holder
            
    org = _extract_certificate_org(text) or default_metadata.get("organization")
    issue_date = _extract_certificate_date(text) or default_metadata.get("issueDate")
    
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      issue_date,
        "expiryDate":     None,
        "documentNumber": default_metadata.get("documentNumber"),
    }


def extract_passport_metadata(text: str, default_metadata: dict) -> dict:
    doc_name = "Passport"
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # 1. Holder Name
    holder = None
    # A) Try explicit label matching (Full name / Họ và tên / Surname / Given names)
    name_labels = [
        r'\b(?:full\s*name|họ\s*và\s*tên|ho\s*va\s*ten|va\s*ten)\b',
        r'\b(?:given\s*names?|first\s*name)\b',
        r'\b(?:surname|last\s*name)\b',
        r'\bname\b'
    ]
    for idx, line in enumerate(lines):
        for lbl in name_labels:
            if re.search(lbl, line, re.IGNORECASE):
                # Check remainder of same line
                cand = re.sub(lbl, '', line, flags=re.IGNORECASE).strip(' :-–—/')
                if cand and _is_valid_person_name(cand):
                    holder = cand if cand == cand.upper() else cand.title()
                    break
                # Check next line
                if idx + 1 < len(lines):
                    next_cand = lines[idx + 1].strip(' :-–—/')
                    if _is_valid_person_name(next_cand):
                        holder = next_cand if next_cand == next_cand.upper() else next_cand.title()
                        break
        if holder:
            break
            
    # B) Try MRZ match if not found
    if not holder:
        mrz_match = re.search(r'P<([A-Z]{3})([A-Z<]+?)<<([A-Z<]+)', text.upper())
        if mrz_match:
            surname = mrz_match.group(2).replace('<', ' ').strip()
            given = mrz_match.group(3).replace('<', ' ').strip()
            full = f"{surname} {given}".strip()
            if _is_valid_person_name(full):
                holder = full
                
    if not holder:
        cand_default = default_metadata.get("holderName")
        if cand_default and _is_valid_person_name(cand_default):
            holder = cand_default

    # 2. Organization
    org = "Government of India"
    text_lower = text.lower()
    if "socialist republic of vietnam" in text_lower or "vietnam" in text_lower or "vnm" in text_lower:
        org = "Socialist Republic of Vietnam"
    elif "republic of" in text_lower:
        m = re.search(r'republic\s+of\s+([A-Za-z\ ]+)', text, re.IGNORECASE)
        if m:
            org = f"Republic of {m.group(1).strip().title()}"
    elif "united states" in text_lower or "usa" in text_lower:
        org = "United States of America"
            
    # 3. Document Number
    doc_num = None
    num_labels = [
        r'\b(?:passport\s*no\.?|passport\s*number|số\s*hộ\s*chiếu|so\s*ho\s*chieu|passport)\b'
    ]
    for idx, line in enumerate(lines):
        for lbl in num_labels:
            if re.search(lbl, line, re.IGNORECASE):
                same = re.sub(lbl, '', line, flags=re.IGNORECASE).strip(' :-–—/')
                m = re.search(r'\b([A-Z0-9]{7,10})\b', same, re.IGNORECASE)
                if m and any(c.isdigit() for c in m.group(1)):
                    doc_num = m.group(1).upper()
                    break
                for offset in [1, 2, 3]:
                    if idx + offset < len(lines):
                        cand_line = lines[idx + offset].strip(' :-–—/')
                        m = re.search(r'\b([A-Z]\d{7,8})\b', cand_line, re.IGNORECASE)
                        if m:
                            doc_num = m.group(1).upper()
                            break
                if doc_num:
                    break
        if doc_num:
            break
            
    if not doc_num:
        m = re.search(r'\b([A-Z]\d{7})\b', text.upper())
        if m:
            doc_num = m.group(1)
            
    if not doc_num:
        doc_num = default_metadata.get("documentNumber")
        
    # 4. Dates: Issue Date and Expiry Date
    date_regex = r'\b(\d{1,2}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{2,4})\b'
    
    issue_date = None
    expiry_date = None
    
    issue_labels = [r'\b(?:date\s+of\s+issue|issue\s+date|issued\s+on|ngay\s+cap|ngày\s+cấp|d\.?o\.?i\.?)\b']
    expiry_labels = [r'\b(?:date\s+of\s+expiry|expiry\s+date|valid\s+(?:until|thru|through|upto|till)|co\s+gia\s+tri\s+den|có\s+giá\s+trị\s+đến|co\s+gla\s+den|expiry)\b']
    dob_labels = [r'\b(?:date\s+of\s+birth|d\.?o\.?b\.?|ngay\s+sinh|ngày\s+sinh|birth)\b']
    
    line_dates = []
    for idx, line in enumerate(lines):
        for dm in re.finditer(date_regex, line):
            line_dates.append((idx, line, _normalise_date(dm.group(1))))
            
    for idx, line in enumerate(lines):
        if any(re.search(lbl, line, re.IGNORECASE) for lbl in issue_labels):
            for l_idx, l_text, norm_d in line_dates:
                if idx <= l_idx <= idx + 4:
                    if not any(re.search(dl, lines[l_idx], re.IGNORECASE) for dl in dob_labels):
                        issue_date = norm_d
                        break
            if issue_date:
                break
                
    for idx, line in enumerate(lines):
        if any(re.search(lbl, line, re.IGNORECASE) for lbl in expiry_labels):
            for l_idx, l_text, norm_d in line_dates:
                if idx <= l_idx <= idx + 4:
                    if not any(re.search(dl, lines[l_idx], re.IGNORECASE) for dl in dob_labels):
                        if norm_d != issue_date:
                            expiry_date = norm_d
                            break
                        else:
                            expiry_date = norm_d
            if expiry_date:
                break
                
    if (not issue_date or not expiry_date) and len(line_dates) >= 2:
        non_dob_dates = []
        for l_idx, l_text, norm_d in line_dates:
            if not any(re.search(dl, lines[l_idx], re.IGNORECASE) for dl in dob_labels) and not any(re.search(dl, lines[max(0, l_idx-1)], re.IGNORECASE) for dl in dob_labels):
                non_dob_dates.append(norm_d)
        if len(non_dob_dates) >= 2:
            if not issue_date:
                issue_date = non_dob_dates[0]
            if not expiry_date:
                expiry_date = non_dob_dates[1]
                
    if not issue_date:
        issue_date = default_metadata.get("issueDate")
    if not expiry_date:
        expiry_date = default_metadata.get("expiryDate")

    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      issue_date,
        "expiryDate":     expiry_date,
        "documentNumber": doc_num,
    }


def extract_aadhaar_metadata(text: str, default_metadata: dict) -> dict:
    doc_name = "Aadhaar Card"
    
    # 1. Holder
    holder = None
    m = re.search(r'\bTo\b[:\s,]*\n\s*([A-Za-z][A-Za-z\s\.]+)\b', text, re.IGNORECASE)
    if m:
        candidate = m.group(1).strip()
        if _is_valid_person_name(candidate):
            holder = candidate.title()
            
    if not holder:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for idx, line in enumerate(lines[:10]):
            if "government of india" in line.lower() or "भारत सरकार" in line:
                for offset in [1, 2, 3]:
                    if idx + offset < len(lines):
                        candidate = lines[idx + offset].strip()
                        if _is_valid_person_name(candidate) and not any(w in candidate.lower() for w in ["unique", "authority", "aadhar", "aadhaar", "to", "father", "mother"]):
                            holder = candidate.title()
                            break
            if holder:
                break
                
    if not holder or not _is_valid_person_name(holder):
        holder = default_metadata.get("holderName")
        
    # 2. Organization
    org = "UIDAI"
    
    # 3. Document Number
    doc_num = default_metadata.get("documentNumber")
    if not doc_num:
        m = re.search(r'\b(\d{4}\s?\d{4}\s?\d{4})\b', text)
        if m:
            doc_num = m.group(1).strip()
            
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      None,
        "expiryDate":     None,
        "documentNumber": doc_num,
    }


def extract_pan_metadata(text: str, default_metadata: dict) -> dict:
    doc_name = "PAN Card"
    
    # 1. Holder
    holder = None
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        if "permanent account number" in line_lower or "pan card" in line_lower:
            for offset in [1, 2, 3]:
                if idx + offset < len(lines):
                    candidate = lines[idx + offset].strip()
                    if _is_valid_person_name(candidate) and not any(w in candidate.lower() for w in ["father", "name", "date", "birth", "signature"]):
                        holder = candidate.title()
                        break
        if holder:
            break
            
    if not holder:
        for line in lines[:10]:
            clean_line = re.sub(r'^name\s*[:\-–—\s]+', '', line, flags=re.IGNORECASE).strip()
            if _is_valid_person_name(clean_line) and not any(w in clean_line.lower() for w in ["income", "tax", "department", "government", "india", "permanent", "account", "number", "pan", "father", "signature", "birth"]):
                holder = clean_line.title()
                break
                
    if not holder or not _is_valid_person_name(holder):
        holder = default_metadata.get("holderName")
        
    # 2. Organization
    org = "Income Tax Department"
    
    # 3. Document Number
    doc_num = default_metadata.get("documentNumber")
    if not doc_num:
        m = re.search(r'\b([A-Z]{5}\d{4}[A-Z]{1})\b', text.upper())
        if m:
            doc_num = m.group(1).strip()
            
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      None,
        "expiryDate":     None,
        "documentNumber": doc_num,
    }


def extract_driving_license_metadata(text: str, default_metadata: dict) -> dict:
    doc_name = "Driving License"
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # 1. Holder Name (Strictly avoid vehicle classes like LMV / HTV)
    holder = None
    name_labels = [r'\bname\s+of\s+holder\b', r'\blicensee\b', r'\bholder\s*name\b', r'\bname\b']
    for idx, line in enumerate(lines):
        for lbl in name_labels:
            if re.search(lbl, line, re.IGNORECASE):
                # Check same line
                clean = re.sub(lbl, '', line, flags=re.IGNORECASE).strip(' :-–—')
                if clean and _is_valid_person_name(clean):
                    holder = clean.title()
                    break
                # Check next line
                if idx + 1 < len(lines):
                    cand = lines[idx + 1].strip(' :-–—')
                    if _is_valid_person_name(cand):
                        holder = cand.title()
                        break
        if holder:
            break
            
    if not holder:
        cand_default = default_metadata.get("holderName")
        if cand_default and _is_valid_person_name(cand_default):
            holder = cand_default
        
    # 2. Organization
    org = "Ministry of Road Transport and Highways"
    for line in lines[:8]:
        line_lower = line.lower()
        if "transport" in line_lower or "rto" in line_lower or "union territory" in line_lower or "union of india" in line_lower:
            clean_org = re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9\(\)\s]+$', '', line).strip()
            if 4 <= len(clean_org) <= 80:
                org = clean_org.title()
                break
            
    # 3. Document Number (Prioritize DL No. over Badge No.)
    doc_num = None
    dl_labels = [
        r'\b(?:i\s*dl|idl|id|dl|d\.l\.)\s*no\b\.?',
        r'\bdl\s*number\b', r'\bd\.l\.\s*number\b',
        r'\blicen[cs]e\s*no\b\.?', r'\bdriving\s+licen[cs]e\s+no\b\.?',
        r'\bdriving\s+licen[cs]e\b'
    ]
    for idx, line in enumerate(lines):
        for lbl in dl_labels:
            if re.search(lbl, line, re.IGNORECASE):
                # Check same line
                same_line = re.sub(lbl, '', line, flags=re.IGNORECASE).strip(' :-–—')
                m = re.search(r'\b([A-Z]{2}\s?\d{2}\s?[A-Z0-9\s/-]{4,15})\b', same_line, re.IGNORECASE)
                if m:
                    doc_num = m.group(1).strip()
                    break
                # Check next 2 lines
                for offset in [1, 2]:
                    if idx + offset < len(lines):
                        next_line = lines[idx + offset]
                        # Avoid picking badge lines or date lines as DL number
                        if not any(re.search(b_lbl, next_line, re.IGNORECASE) for b_lbl in [r'\bbadge\b', r'\bdate\b', r'\bdare\b', r'\bvalid\b', r'\bissue\b']):
                            m = re.search(r'\b([A-Z]{2}\s?\d{2}\s?[A-Z0-9\s/-]{4,15})\b', next_line, re.IGNORECASE)
                            if m:
                                doc_num = m.group(1).strip()
                                break
                if doc_num:
                    break
        if doc_num:
            break

    if not doc_num:
        # Look for Indian DL standard pattern excluding Badge lines
        for idx, line in enumerate(lines):
            is_badge = 'badge' in line.lower() or (idx > 0 and 'badge' in lines[idx-1].lower())
            if not is_badge:
                m = re.search(r'\b([A-Z]{2}\s?\d{2}\s?\d{4,11})\b', line, re.IGNORECASE)
                if m:
                    doc_num = m.group(1).strip()
                    break

    if not doc_num:
        doc_num = default_metadata.get("documentNumber")
        # If default document number is a short badge number, discard it if it was from Badge No.
        if doc_num and len(doc_num.replace(" ", "")) < 6:
            doc_num = None

    # 4. Issue Date (Prioritize "Date of Issue" / "Dare of Issue" / "DOI")
    issue_date = None
    date_regex = r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b'
    issue_labels = [r'\b(?:date\s+of\s+issue|dare\s+of\s+issue|issue\s+date|issued\s+on|d\.?o\.?i\.?)\b']
    for idx, line in enumerate(lines):
        for lbl in issue_labels:
            if re.search(lbl, line, re.IGNORECASE):
                for offset in [0, 1, 2]:
                    if idx + offset < len(lines):
                        m = re.search(date_regex, lines[idx + offset])
                        if m:
                            issue_date = _normalise_date(m.group(1))
                            break
                if issue_date:
                    break
        if issue_date:
            break

    if not issue_date:
        issue_date = default_metadata.get("issueDate")

    # 5. Expiry Date (Prioritize "Valid Till" / "Valid To" / "Expiry", strictly avoid DOB)
    expiry_date = None
    expiry_labels = [
        r'\bvalid\s+(?:til[a-z]*|to|upto|until|through|ity|valid)\b',
        r'\b(?:validity|expiry\s+date|date\s+of\s+expiry|expiry)\b'
    ]
    dob_labels = [r'\b(?:date\s+of\s+birth|d\.?o\.?b\.?|birth)\b']
    for idx, line in enumerate(lines):
        for lbl in expiry_labels:
            if re.search(lbl, line, re.IGNORECASE):
                found_dates = []
                for offset in range(0, 5):
                    if idx + offset < len(lines):
                        cand_line = lines[idx + offset]
                        # Stop if reached DOB
                        if any(re.search(dob_l, cand_line, re.IGNORECASE) for dob_l in dob_labels):
                            break
                        for dm in re.finditer(date_regex, cand_line):
                            norm = _normalise_date(dm.group(1))
                            found_dates.append(norm)
                if found_dates:
                    # Filter out issue_date if distinct expiry dates exist
                    valid_dates = [d for d in found_dates if d != issue_date]
                    if valid_dates:
                        expiry_date = valid_dates[0]
                    else:
                        expiry_date = found_dates[-1]
                    break
        if expiry_date:
            break

    if not expiry_date:
        expiry_date = default_metadata.get("expiryDate")
            
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      issue_date,
        "expiryDate":     expiry_date,
        "documentNumber": doc_num,
    }


def extract_internship_certificate_metadata(text: str, default_metadata: dict) -> dict:
    doc_name = "Internship Certificate"
    
    # 1. Holder
    holder = _extract_certificate_holder(text)
    if not holder:
        default_holder = default_metadata.get("holderName")
        if default_holder and _is_valid_person_name(default_holder):
            holder = default_holder
            
    # 2. Organization
    org = _extract_certificate_org(text) or default_metadata.get("organization")
    
    # 3. Issue Date
    issue_date = _extract_certificate_date(text) or default_metadata.get("issueDate")
    
    return {
        "documentName":   doc_name,
        "holderName":     holder,
        "organization":   org,
        "issueDate":      issue_date,
        "expiryDate":     None,
        "documentNumber": default_metadata.get("documentNumber"),
    }


