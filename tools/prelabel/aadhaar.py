"""
tools/prelabel/aadhaar.py
==========================
Aadhaar Card BIO pre-labeler for the LifeVault dataset framework.

Detects:
  B/I-HOLDER_NAME
  B/I-DOCUMENT_NUMBER
  B/I-DATE_OF_BIRTH
  B/I-GENDER
  B/I-ADDRESS
  B/I-DOCUMENT_TITLE
  O
"""

import re

# ── Regex helpers ─────────────────────────────────────────────────────────────

# DOB patterns: e.g. 24/07/2003, 24-07-2003, 24.07.2003
RE_DATE_DMY = re.compile(r"^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$")
RE_YEAR = re.compile(r"^(19|20)\d{2}$")

# Aadhaar Number patterns: 12 digits or 4 digits
RE_AADHAAR_12 = re.compile(r"^\d{12}$")
RE_AADHAAR_4 = re.compile(r"^\d{4}$")

# PIN code pattern for address termination: 6 digits
RE_PINCODE = re.compile(r"^\d{6}$")

# Gender triggers
GENDER_WORDS = {"male", "female", "other", "transgender"}

# Title triggers/terms
TITLE_TERMS = {
    "government", "india", "unique", "identification", "authority", "uidai",
    "भारत", "सरकार", "विशिष्ट", "पहचान", "प्राधिकरण", "आधार", "indla"
}

# Ignore list for holder name (UIDAI organization terms)
IGNORE_NAME_WORDS = {
    "government", "india", "unique", "identification", "authority", "uidai",
    "enrollment", "number", "no", "no:", "address", "phone", "mobile", "dob",
    "date", "birth", "year", "male", "female", "father", "husband", "son",
    "daughter", "wife", "s/o", "d/o", "w/o", "c/o", "of", "and", "invalid",
    "signature", "electronic", "help", "website", "email", "download",
    "yash", "your", "aadhaar", "card", "generation", "date:", "issue", "issued",
    "holder", "name", "uid", "vid", "back", "front", "image", "photo", "indla"
}

DOB_TRIGGERS = {"dob", "dob:", "birth", "yob", "yob:", "yob :"}
ADDRESS_TRIGGERS = {"address", "address:", "s/o", "d/o", "w/o", "c/o", "s/o:", "d/o:", "w/o:", "c/o:", "पता", "पता:"}

def _tok_low(t: str) -> str:
    return t.lower().strip(".,;:()[]{}\"'/\\")

def prelabel_words(words: list[dict]) -> list[dict]:
    n = len(words)
    labels = ["O"] * n
    lowers = [_tok_low(w["text"]) for w in words]

    # 1. Document Title Detection
    for i in range(n):
        tok_low = lowers[i]
        if any(t in tok_low for t in TITLE_TERMS) or tok_low in {"government", "unique", "भारत", "विशिष्ट", "unique-identification"}:
            labels[i] = "B-DOCUMENT_TITLE" if i == 0 or labels[i-1] == "O" else "I-DOCUMENT_TITLE"

    # 2. Gender Detection
    for i, w in enumerate(words):
        if lowers[i] in GENDER_WORDS:
            labels[i] = "B-GENDER"

    # 3. DOB Detection
    for i, w in enumerate(words):
        tok = w["text"]
        if RE_DATE_DMY.match(tok) or RE_YEAR.match(tok):
            context = " ".join(lowers[max(0, i-4): i])
            if any(trig in context for trig in DOB_TRIGGERS):
                labels[i] = "B-DATE_OF_BIRTH"

    # 4. Document Number (Aadhaar Number) Detection
    i = 0
    while i < n:
        cleaned = words[i]["text"].replace(" ", "")
        if RE_AADHAAR_12.match(cleaned):
            labels[i] = "B-DOCUMENT_NUMBER"
            i += 1
        elif i + 2 < n:
            c1 = words[i]["text"].strip()
            c2 = words[i+1]["text"].strip()
            c3 = words[i+2]["text"].strip()
            if RE_AADHAAR_4.match(c1) and RE_AADHAAR_4.match(c2) and RE_AADHAAR_4.match(c3):
                labels[i] = "B-DOCUMENT_NUMBER"
                labels[i+1] = "I-DOCUMENT_NUMBER"
                labels[i+2] = "I-DOCUMENT_NUMBER"
                i += 3
            else:
                i += 1
        else:
            i += 1

    # 5. Address Detection
    address_started = False
    for i in range(n):
        if labels[i] != "O":
            if address_started:
                address_started = False
            continue
        
        if not address_started:
            context = " ".join(lowers[max(0, i-2):i+1])
            if any(trig == context or context.endswith(trig) for trig in ADDRESS_TRIGGERS):
                address_started = True
                continue
        
        if address_started:
            labels[i] = "B-ADDRESS" if "B-ADDRESS" not in labels[max(0, i-10):i] else "I-ADDRESS"
            if RE_PINCODE.match(words[i]["text"]):
                address_started = False

    # 6. Holder Name Detection
    dob_idx = -1
    for k in range(n):
        if labels[k] == "B-DATE_OF_BIRTH" or lowers[k] in DOB_TRIGGERS:
            dob_idx = k
            break
            
    name_candidates = []
    search_limit = dob_idx if dob_idx != -1 else n
    for k in range(search_limit):
        if labels[k] != "O":
            continue
        tok = words[k]["text"]
        tok_low = lowers[k]
        box = words[k]["box"]
        
        # Holder name must be below the top 200 units to avoid top headers/garbage
        if box[1] < 200:
            continue
            
        cleaned_tok = tok.strip(".,;:()[]{}\"'/\\")
        if len(cleaned_tok) >= 2 and re.match(r"^[A-Za-z\s\.\']+$", cleaned_tok):
            subwords = cleaned_tok.split()
            if all(sw[0].isupper() or sw.isupper() for sw in subwords):
                if not any(sw.lower() in IGNORE_NAME_WORDS for sw in subwords):
                    name_candidates.append(k)

    name_runs = []
    current_run = []
    for idx in name_candidates:
        if not current_run:
            current_run.append(idx)
        elif idx == current_run[-1] + 1:
            current_run.append(idx)
        else:
            if len(current_run) >= 1:
                name_runs.append(current_run)
            current_run = [idx]
    if len(current_run) >= 1:
        name_runs.append(current_run)

    if name_runs:
        # Choose the first candidate name run
        chosen_run = name_runs[0]
        for rank, idx in enumerate(chosen_run):
            labels[idx] = "B-HOLDER_NAME" if rank == 0 else "I-HOLDER_NAME"

    # BIO auto-correction pass
    prev_label = "O"
    for i in range(n):
        lbl = labels[i]
        if lbl.startswith("I-"):
            ent = lbl[2:]
            if prev_label not in (f"B-{ent}", f"I-{ent}"):
                labels[i] = f"B-{ent}"
        prev_label = labels[i]

    return [{"text": words[i]["text"], "box": words[i]["box"], "label": labels[i]} for i in range(n)]
