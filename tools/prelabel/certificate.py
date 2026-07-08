"""
tools/prelabel/certificate.py
==============================
Certificate-specific BIO pre-labeler for the LifeVault dataset framework.

Detects:
  B/I-HOLDER_NAME    — Person receiving the certificate
  B/I-ORGANIZATION   — Issuing organization
  B/I-DOCUMENT_TITLE — Certificate subject / program name
  B/I-ISSUE_DATE     — Date of issue
  B/I-DOCUMENT_NUMBER — Certificate ID / credential number
  O                  — Everything else

Public API:
    prelabel_words(words: list[WordBox]) -> list[dict]
"""

import re

# ── Date regexes ──────────────────────────────────────────────────────────────

_MONTHS = (r"(?:January|February|March|April|May|June|July|August|September|"
           r"October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)")

RE_DATE_FULL  = re.compile(
    rf"^{_MONTHS}\.?\s+\d{{1,2}},?\s+\d{{4}}$", re.IGNORECASE)
RE_DATE_MY    = re.compile(rf"^{_MONTHS}\.?\s+\d{{4}}$", re.IGNORECASE)
RE_DATE_YEAR  = re.compile(r"^(19|20)\d{2}$")
RE_DATE_DMY   = re.compile(r"^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$")
RE_DATE_YMD   = re.compile(r"^\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}$")
RE_DATE_RANGE = re.compile(
    r"^(19|20)\d{2}\s*[-\u2013]\s*(?:(19|20)\d{2}|[Pp]resent)$")

def _is_date(tok: str) -> bool:
    return bool(
        RE_DATE_FULL.match(tok) or RE_DATE_MY.match(tok) or
        RE_DATE_YEAR.match(tok) or RE_DATE_DMY.match(tok) or
        RE_DATE_YMD.match(tok)  or RE_DATE_RANGE.match(tok)
    )

# ── Certificate number pattern ────────────────────────────────────────────────
# Alphanumeric strings that look like IDs (6+ chars, mixed letters/digits)
RE_CERT_NUM = re.compile(r"^[A-Z0-9]{6,}$")

# Keywords that signal a cert number is nearby
CERT_NUM_TRIGGERS = {
    "no.", "no:", "number", "id:", "id", "credential", "certificate#",
    "cert.", "cert#", "serial", "reference", "ref.", "ref:",
}

# ── Trigger phrases for HOLDER_NAME ──────────────────────────────────────────
HOLDER_TRIGGERS = {
    "certifies that", "awarded to", "presented to",
    "this is to certify that", "completed by", "this certifies that",
    "is hereby awarded to", "is presented to", "has successfully",
    "has completed", "congratulations to",
}

# ── Known issuing organizations ───────────────────────────────────────────────
KNOWN_ORGS = {
    # Cloud / Tech giants
    "google", "amazon", "aws", "microsoft", "apple", "meta", "ibm",
    "oracle", "salesforce", "sap", "cisco", "intel", "nvidia",
    # Learning platforms
    "coursera", "udemy", "edx", "linkedin", "linkedin learning",
    "pluralsight", "datacamp", "codecademy", "udacity", "great learning",
    "simplilearn", "nptel", "swayam", "alison", "skillshare",
    # Database / Dev tools
    "mongodb", "postgresql", "mysql", "redis", "elastic", "databricks",
    "snowflake", "tableau", "power bi",
    # Cloud certifications
    "aws certified", "google cloud", "azure", "gcp",
    # Indian orgs
    "nasscom", "infosys", "tcs", "wipro", "cognizant", "hcl",
    "kongu engineering college", "anna university",
    # Generic
    "institute", "academy", "university", "college", "school",
    "foundation", "association", "society",
}

def _is_known_org(tok_low: str) -> bool:
    return any(tok_low == org or tok_low.startswith(org) for org in KNOWN_ORGS)

# ── Certificate title keywords ────────────────────────────────────────────────
TITLE_PHRASES = {
    # Generic cert titles
    "certificate of completion", "certificate of achievement",
    "certificate of participation", "certificate of excellence",
    "certificate of appreciation", "certificate of merit",
    "certificate of training", "award of excellence",
    # Tech domains (single words that signal a title token)
    "python", "java", "javascript", "sql", "r", "scala",
    "machine learning", "deep learning", "data science", "data analysis",
    "artificial intelligence", "ai", "nlp", "computer vision",
    "cloud computing", "devops", "cybersecurity", "blockchain",
    "web development", "mobile development", "android", "ios",
    "database", "networking", "linux", "git",
    "matlab", "tensorflow", "pytorch", "keras", "scikit-learn",
    "tableau", "power bi", "excel", "statistics",
    # Coursera / NPTEL style
    "associate developer", "professional developer", "fundamentals",
    "essentials", "advanced", "intermediate", "beginner",
    "specialization", "nanodegree", "bootcamp",
    # IOT, DSA etc.
    "internet of things", "iot", "data structures", "algorithms",
    "dsa", "operating systems", "computer networks",
    "software engineering", "software development",
    "ocr", "natural language processing",
}

def _is_title_word(tok_low: str) -> bool:
    return any(tok_low == t or tok_low.startswith(t) for t in TITLE_PHRASES)


# ── Layout helpers ────────────────────────────────────────────────────────────

def _in_top_band(box: list[int], pct: float = 0.25) -> bool:
    """Is the word in the top `pct` of the normalized 1000-unit page?"""
    return box[3] < int(1000 * pct)

def _in_bottom_band(box: list[int], pct: float = 0.15) -> bool:
    return box[1] > int(1000 * (1 - pct))

def _tok_low(t: str) -> str:
    return t.lower().strip(".,;:()[]{}\"'/\\\"")


# ── Main prelabeler ───────────────────────────────────────────────────────────

def prelabel_words(words: list[dict]) -> list[dict]:
    """
    Assign BIO labels to certificate word tokens.
    Returns list of {"text", "box", "label"} dicts.
    """
    n      = len(words)
    labels = ["O"] * n

    # Pre-compute lower-case tokens and full text of document for trigger search
    lowers = [_tok_low(w["text"]) for w in words]
    full_text_lower = " ".join(lowers)

    # ── Step 1: Mark dates ────────────────────────────────────────────────────
    for i, w in enumerate(words):
        if _is_date(w["text"]):
            labels[i] = "B-ISSUE_DATE"

    # ── Step 2: Certificate number detection ─────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok = w["text"]
        if RE_CERT_NUM.match(tok):
            # Only label as cert number if preceded by a trigger keyword
            prev_low = lowers[i - 1] if i > 0 else ""
            if prev_low in CERT_NUM_TRIGGERS or (i > 1 and lowers[i - 2] in CERT_NUM_TRIGGERS):
                labels[i] = "B-DOCUMENT_NUMBER"

    # ── Step 3: Organization detection (KNOWN_ORGS dictionary only) ──────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok_low = lowers[i]
        if _is_known_org(tok_low):
            labels[i] = "B-ORGANIZATION"
            # Extend span for multi-word org names (stop at already-labeled tokens)
            j = i + 1
            while j < n and j < i + 4 and labels[j] == "O":
                if words[j]["text"][0].isupper() or lowers[j] in {"of", "and", "&"}:
                    labels[j] = "I-ORGANIZATION"
                    j += 1
                else:
                    break

    # ── Step 4: Document title detection ─────────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok_low = lowers[i]
        if _is_title_word(tok_low):
            labels[i] = "B-DOCUMENT_TITLE"
            # Extend span for multi-word titles
            j = i + 1
            while j < n and j < i + 6 and labels[j] == "O":
                next_low = lowers[j]
                if next_low in {"in", "of", "and", "with", "for", "using",
                                "fundamentals", "essentials", "advanced",
                                "techniques", "programming", "development",
                                "analysis", "design", "management"}:
                    labels[j] = "I-DOCUMENT_TITLE"
                    j += 1
                elif words[j]["text"][0].isupper():
                    labels[j] = "I-DOCUMENT_TITLE"
                    j += 1
                else:
                    break

    # ── Step 5: Holder name via trigger phrases ───────────────────────────────
    # Process trigger-follow windows: find consecutive name-like tokens
    # Process trigger-follow windows: find consecutive name-like tokens
    # immediately after each trigger and assign B/I correctly.
    # Sort windows by position and treat each trigger hit independently.
    trigger_windows: list[tuple[int, int]] = []  # (start_idx, end_idx)
    for trigger in HOLDER_TRIGGERS:
        if trigger in full_text_lower:
            trigger_tokens = trigger.split()
            for i in range(n - len(trigger_tokens)):
                window = " ".join(lowers[i: i + len(trigger_tokens)])
                if window == trigger:
                    start = i + len(trigger_tokens)
                    end   = min(n, start + 5)
                    trigger_windows.append((start, end))
                    break  # only first occurrence per trigger phrase

    for (start, end) in trigger_windows:
        bio_started = False
        for k in range(start, end):
            if labels[k] != "O":
                # Gap — stop this window's span
                break
            tok = words[k]["text"]
            if (tok[0].isupper() or tok.isupper()) and 1 < len(tok) < 30:
                if not bio_started:
                    labels[k]   = "B-HOLDER_NAME"
                    bio_started = True
                else:
                    labels[k] = "I-HOLDER_NAME"
            else:
                break  # Stop at first non-name-like token

    # ── Step 6: Fallback — find prominent name in 15–60% vertical band ──────
    if "B-HOLDER_NAME" not in labels:
        mid_candidates = [
            i for i, w in enumerate(words)
            if 100 < w["box"][1] < 650
            and labels[i] == "O"
            and words[i]["text"][0].isupper()
            and len(words[i]["text"]) > 2
            and not any(c.isdigit() for c in words[i]["text"])
        ]
        # Take first run of consecutive (by index) title-case / upper-case words
        run: list[int] = []
        for idx in mid_candidates[:20]:
            tok = words[idx]["text"]
            if run and idx != run[-1] + 1:
                break  # stop at first gap in indices
            if tok[0].isupper():
                run.append(idx)
        for rank, idx in enumerate(run[:5]):
            labels[idx] = "B-HOLDER_NAME" if rank == 0 else "I-HOLDER_NAME"

    # ── BIO auto-correction (safety pass) ─────────────────────────────────────
    # Guarantee valid BIO sequences: any I-X that doesn't follow B-X or I-X
    # is converted to B-X so the validator never sees an orphaned continuation.
    prev_label = "O"
    for i in range(n):
        lbl = labels[i]
        if lbl.startswith("I-"):
            ent = lbl[2:]
            if prev_label not in (f"B-{ent}", f"I-{ent}"):
                labels[i] = f"B-{ent}"   # promote: start a new span
        prev_label = labels[i]

    # ── Build output ──────────────────────────────────────────────────────────
    return [{"text": words[i]["text"], "box": words[i]["box"], "label": labels[i]}
            for i in range(n)]
