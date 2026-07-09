"""
tools/prelabel/pan.py
======================
PAN Card BIO pre-labeler for the LifeVault dataset framework.

Detects:
  B/I-HOLDER_NAME
  B/I-DOCUMENT_NUMBER
  B/I-DATE_OF_BIRTH
  B/I-FATHER_NAME
  B/I-DOCUMENT_TITLE
  O
"""

import re

# ── Regex helpers ─────────────────────────────────────────────────────────────

# DOB pattern: e.g. 16/07/1986
RE_DATE_DMY = re.compile(r"^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$")

# PAN Number pattern (10 alphanumeric chars, allowing minor OCR substitutions like O/0, I/1)
RE_PAN = re.compile(r"^[A-Z0-9]{10}$", re.IGNORECASE)

# Title triggers/terms
TITLE_WORDS = {
    "income", "tax", "department", "govt", "government", "india", "permanent",
    "account", "number", "card", "penmanent", "parmanent", "accouni", "numbor"
}

# Words to ignore when detecting names
IGNORE_NAME_WORDS = {
    "income", "tax", "department", "govt", "government", "india", "permanent",
    "account", "number", "card", "signature", "photo", "date", "birth", "father",
    "father's", "name", "penmanent", "parmanent", "accouni", "numbor", "of", "and"
}

def _tok_low(t: str) -> str:
    return t.lower().strip(".,;:()[]{}\"'/\\")

def prelabel_words(words: list[dict]) -> list[dict]:
    n = len(words)
    labels = ["O"] * n
    lowers = [_tok_low(w["text"]) for w in words]

    # 1. Document Title Detection
    for i in range(n):
        tok_low = lowers[i]
        if any(t in tok_low for t in TITLE_WORDS):
            labels[i] = "B-DOCUMENT_TITLE" if i == 0 or labels[i-1] == "O" else "I-DOCUMENT_TITLE"

    # 2. Date of Birth Detection
    for i, w in enumerate(words):
        if RE_DATE_DMY.match(w["text"]):
            labels[i] = "B-DATE_OF_BIRTH"

    # 3. PAN Number (Document Number) Detection
    for i, w in enumerate(words):
        if RE_PAN.match(w["text"]):
            labels[i] = "B-DOCUMENT_NUMBER"

    # 4. Holder and Father Name Detection
    dob_idx = -1
    for k in range(n):
        if labels[k] == "B-DATE_OF_BIRTH":
            dob_idx = k
            break

    search_limit = dob_idx if dob_idx != -1 else n
    name_candidates = []
    
    for k in range(search_limit):
        if labels[k] != "O":
            continue
        tok = words[k]["text"]
        tok_low = lowers[k]
        box = words[k]["box"]
        
        # Names must be below the top 200 units to filter out top headers
        if box[1] < 200:
            continue
            
        cleaned_tok = tok.strip(".,;:()[]{}\"'/\\")
        if len(cleaned_tok) >= 2 and re.match(r"^[A-Za-z\s\.\']+$", cleaned_tok):
            subwords = cleaned_tok.split()
            if all(sw[0].isupper() or sw.isupper() for sw in subwords):
                if not any(sw.lower() in IGNORE_NAME_WORDS for sw in subwords):
                    name_candidates.append(k)

    # Group into consecutive word runs
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

    # Distribute the first two runs: first run is Holder Name, second is Father Name
    runs_assigned = 0
    for run in name_runs:
        if runs_assigned == 0:
            for rank, idx in enumerate(run):
                labels[idx] = "B-HOLDER_NAME" if rank == 0 else "I-HOLDER_NAME"
            runs_assigned += 1
        elif runs_assigned == 1:
            for rank, idx in enumerate(run):
                labels[idx] = "B-FATHER_NAME" if rank == 0 else "I-FATHER_NAME"
            runs_assigned += 1
            break

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
