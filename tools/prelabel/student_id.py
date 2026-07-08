"""
tools/prelabel/student_id.py
=============================
Student ID card BIO pre-labeler for the LifeVault dataset framework.

Detects:
  B/I-HOLDER_NAME     — Student's name
  B/I-ORGANIZATION    — Issuing institution
  B/I-DOCUMENT_NUMBER — Register No / Roll No / Student ID
  B/I-DOCUMENT_TITLE  — "Student Identity Card", "College ID Card", etc.
  B/I-ISSUE_DATE      — Date of issue
  B/I-EXPIRY_DATE     — Valid until / Expiry date
  O                   — Everything else

Public API:
    prelabel_words(words: list[WordBox]) -> list[dict]
"""

import re

# ── Date regex helpers ────────────────────────────────────────────────────────

_MONTHS = (r"(?:January|February|March|April|May|June|July|August|September|"
           r"October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)")

RE_DATE_FULL  = re.compile(rf"^{_MONTHS}\.?\s+\d{{1,2}},?\s+\d{{4}}$",  re.I)
RE_DATE_MY    = re.compile(rf"^{_MONTHS}\.?\s+\d{{4}}$",                 re.I)
RE_DATE_DMY   = re.compile(r"^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$")
RE_DATE_YMD   = re.compile(r"^\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}$")
RE_DATE_YEAR  = re.compile(r"^(19|20)\d{2}$")
RE_DATE_RANGE = re.compile(r"^(19|20)\d{2}\s*[-–]\s*(?:(19|20)\d{2}|[Pp]resent)$")

def _is_date(tok: str) -> bool:
    return bool(
        RE_DATE_FULL.match(tok)  or RE_DATE_MY.match(tok) or
        RE_DATE_DMY.match(tok)   or RE_DATE_YMD.match(tok) or
        RE_DATE_YEAR.match(tok)  or RE_DATE_RANGE.match(tok)
    )

# ── Document number patterns ──────────────────────────────────────────────────
# Student ID numbers: mix of letters + digits, 5+ chars
RE_STUDENT_NUM = re.compile(r"^[A-Z0-9]{5,}$")
RE_NUM_WITH_SLASH = re.compile(r"^\d{2}/[A-Z]{2,}/\d{3,}$", re.I)  # e.g. 23/IT/019

DOC_NUM_TRIGGERS = {
    # English
    "register", "reg.", "reg:", "reg#", "roll", "admission",
    "enrolment", "enrollment", "id:", "id#", "no.", "no:", "number",
    "student", "reg.no", "roll.no", "rollno", "regno",
    # Tamil transliterations common on Indian college IDs
    "padiveddam",
}

# ── Name trigger labels ───────────────────────────────────────────────────────
NAME_TRIGGERS = {
    "name", "name:", "student name", "student name:", "holder name",
    "holder name:", "name of student", "student:", "full name",
    "full name:", "bearer name",
}

# ── Expiry / validity triggers ────────────────────────────────────────────────
EXPIRY_TRIGGERS = {
    "valid", "valid until", "valid upto", "validity", "expiry", "expires",
    "expiry date", "valid till", "valid through", "date of expiry",
    "expires on", "expiration",
}

# ── Known organizations ───────────────────────────────────────────────────────
KNOWN_ORGS = {
    # Indian college/university terms
    "university", "institute", "college", "polytechnic", "campus",
    "school", "academy", "faculty", "institution",
    # Specific well-known ones
    "kongu", "anna", "psg", "vit", "srm", "sastra", "amrita",
    "manipal", "bits", "iit", "nit", "iiit", "mit", "kec",
    "sona", "lieu", "karunya", "vel tech", "sathyabama",
    "bharathidasan", "madurai kamaraj", "annamalai", "periyar",
    "bharathiar", "alagappa", "thiruvalluvar", "mother teresa",
    # Generic
    "engineering", "technology", "science", "arts", "management",
    "commerce", "education",
}

# ── Card title keywords ───────────────────────────────────────────────────────
TITLE_KEYWORDS = {
    "identity", "identification", "id card", "identity card",
    "student id", "student identity", "campus card", "college id",
    "hall ticket", "library card", "access card",
    # Common short forms
    "id", "i.d", "i.d.",
}

TITLE_CONTINUATION = {
    "card", "pass", "identity", "identification",
}


def _tok_low(t: str) -> str:
    return t.lower().strip(".,;:()[]{}\"'/\\")


def _in_top_third(box: list[int]) -> bool:
    return box[3] < 340   # top ~1/3 of normalized 1000-unit page


def _in_bottom_quarter(box: list[int]) -> bool:
    return box[1] > 750


def _is_known_org(tok_low: str) -> bool:
    return any(tok_low == org or tok_low.startswith(org) for org in KNOWN_ORGS)


def _is_title_token(tok_low: str) -> bool:
    return any(tok_low == t or tok_low.startswith(t) for t in TITLE_KEYWORDS)


# ── Main prelabeler ───────────────────────────────────────────────────────────

def prelabel_words(words: list[dict]) -> list[dict]:
    """
    Assign BIO labels to Student ID card word tokens.
    Returns list of {"text", "box", "label"} dicts.
    """
    n      = len(words)
    labels = ["O"] * n
    lowers = [_tok_low(w["text"]) for w in words]
    full_lower = " ".join(lowers)

    # ── Step 1: Date detection (issue / expiry) ───────────────────────────────
    for i, w in enumerate(words):
        if _is_date(w["text"]):
            # Check preceding tokens for expiry triggers
            context = " ".join(lowers[max(0, i-3): i])
            if any(t in context for t in EXPIRY_TRIGGERS):
                labels[i] = "B-EXPIRY_DATE"
            else:
                labels[i] = "B-ISSUE_DATE"

    # ── Step 2: Document number detection ────────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok = w["text"]
        tok_low = lowers[i]

        # Pattern match: alphanumeric ID strings
        if RE_STUDENT_NUM.match(tok) or RE_NUM_WITH_SLASH.match(tok):
            # Only if preceded by a trigger keyword (within 3 tokens)
            context_lows = lowers[max(0, i-4): i]
            if any(trig in " ".join(context_lows) for trig in DOC_NUM_TRIGGERS):
                labels[i] = "B-DOCUMENT_NUMBER"
                # Extend for compound IDs (e.g., "23 IT 019")
                j = i + 1
                while j < n and j < i + 3 and labels[j] == "O":
                    if re.match(r"^[A-Z0-9]{2,}$", words[j]["text"]):
                        labels[j] = "I-DOCUMENT_NUMBER"
                        j += 1
                    else:
                        break

    # ── Step 3: Organization detection ───────────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok_low = lowers[i]
        if _is_known_org(tok_low):
            labels[i] = "B-ORGANIZATION"
            # Extend rightward for multi-word institution names
            j = i + 1
            while j < n and j < i + 6 and labels[j] == "O":
                nxt = lowers[j]
                if nxt in {"of", "and", "&", "for"} or words[j]["text"][0].isupper():
                    labels[j] = "I-ORGANIZATION"
                    j += 1
                else:
                    break

    # ── Step 4: Card title detection ─────────────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok_low = lowers[i]
        if _is_title_token(tok_low):
            labels[i] = "B-DOCUMENT_TITLE"
            j = i + 1
            while j < n and j < i + 5 and labels[j] == "O":
                nxt = lowers[j]
                if nxt in TITLE_CONTINUATION or words[j]["text"][0].isupper():
                    labels[j] = "I-DOCUMENT_TITLE"
                    j += 1
                else:
                    break

    # ── Step 5: Holder name via trigger labels ────────────────────────────────
    for trigger in NAME_TRIGGERS:
        if trigger in full_lower:
            trigger_toks = trigger.split()
            for i in range(n - len(trigger_toks)):
                window = " ".join(lowers[i: i + len(trigger_toks)])
                if window == trigger:
                    # Name tokens immediately follow the trigger
                    bio_started = False
                    for k in range(i + len(trigger_toks), min(n, i + len(trigger_toks) + 5)):
                        if labels[k] != "O":
                            break
                        tok = words[k]["text"]
                        if (tok[0].isupper() or tok.isupper()) and 1 < len(tok) < 35:
                            labels[k] = "B-HOLDER_NAME" if not bio_started else "I-HOLDER_NAME"
                            bio_started = True
                        else:
                            break
                    break

    # ── Step 6: Fallback holder name — prominent text in upper-mid zone ───────
    if "B-HOLDER_NAME" not in labels:
        # Student cards typically show the name large, near top 20–60%
        mid_candidates = [
            i for i, w in enumerate(words)
            if 80 < w["box"][1] < 600
            and labels[i] == "O"
            and words[i]["text"][0].isupper()
            and len(words[i]["text"]) > 2
            and not any(c.isdigit() for c in words[i]["text"])
            and not _is_known_org(lowers[i])
        ]
        # Take the first consecutive run of name-like tokens
        run: list[int] = []
        for idx in mid_candidates[:15]:
            tok = words[idx]["text"]
            if run and idx != run[-1] + 1:
                break
            if tok[0].isupper():
                run.append(idx)
        for rank, idx in enumerate(run[:5]):
            labels[idx] = "B-HOLDER_NAME" if rank == 0 else "I-HOLDER_NAME"

    # ── BIO auto-correction (safety pass) ────────────────────────────────────
    prev_label = "O"
    for i in range(n):
        lbl = labels[i]
        if lbl.startswith("I-"):
            ent = lbl[2:]
            if prev_label not in (f"B-{ent}", f"I-{ent}"):
                labels[i] = f"B-{ent}"   # promote orphaned I- to B-
        prev_label = labels[i]

    return [{"text": words[i]["text"], "box": words[i]["box"], "label": labels[i]}
            for i in range(n)]
