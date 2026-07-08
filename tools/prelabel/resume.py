"""
tools/prelabel/resume.py
========================
Resume-specific BIO pre-labeler for the LifeVault dataset framework.

Public API:
    prelabel_words(words: list[WordBox]) -> list[dict]
"""

import re

# ── Regexes ───────────────────────────────────────────────────────────────────

RE_EMAIL = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

RE_PHONE = re.compile(
    r"^(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$"
    r"|^\+?91[-.\s]?\d{5}[-.\s]?\d{5}$"
)

RE_DATE_YEAR  = re.compile(r"^(19|20)\d{2}$")
RE_DATE_RANGE = re.compile(r"^(19|20)\d{2}[-\u2013](19|20)\d{2}|present$", re.IGNORECASE)
RE_DATE_MONTH = re.compile(
    r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(19|20)\d{2}$",
    re.IGNORECASE,
)

# ── Skills dictionary ─────────────────────────────────────────────────────────

SKILL_KEYWORDS = {
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "ruby",
    "php", "go", "golang", "rust", "swift", "kotlin", "scala", "r", "matlab",
    "perl", "shell", "bash", "powershell", "vba", "dart", "lua", "haskell",
    "html", "css", "html5", "css3", "react", "reactjs", "angular", "angularjs",
    "vue", "vuejs", "nextjs", "nuxtjs", "svelte", "jquery", "bootstrap",
    "tailwindcss", "sass", "less", "webpack", "vite",
    "nodejs", "node.js", "express", "expressjs", "django", "flask", "fastapi",
    "spring", "springboot", "laravel", "rails", "asp.net", "dotnet",
    "sql", "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis",
    "elasticsearch", "cassandra", "dynamodb", "firebase", "supabase", "oracle",
    "mssql", "nosql", "graphql",
    "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "jenkins", "github",
    "gitlab", "ci/cd", "terraform", "ansible", "linux", "nginx", "apache",
    "heroku", "vercel", "netlify",
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "scikit-learn", "sklearn", "pandas", "numpy", "matplotlib", "seaborn",
    "huggingface", "transformers", "opencv", "nlp", "computer vision",
    "data science", "data analysis", "tableau", "powerbi", "spark", "hadoop",
    "android", "ios", "react native", "flutter", "xcode", "android studio",
    "git", "jira", "confluence", "figma", "photoshop", "illustrator",
    "rest", "restful", "api", "microservices", "agile", "scrum", "kanban",
    "selenium", "pytest", "junit", "postman", "swagger",
    "excel", "word", "powerpoint", "microsoft office",
}

SECTION_SKILLS     = {"skills", "technical skills", "core competencies", "technologies",
                      "expertise", "proficiencies", "tools", "stack"}
SECTION_EXPERIENCE = {"experience", "work experience", "employment", "career",
                      "professional experience", "internship", "projects"}
SECTION_EDUCATION  = {"education", "academic", "qualification", "qualifications",
                      "degree", "university", "college", "school"}
SECTION_CONTACT    = {"contact", "contacts", "personal information", "details",
                      "profile", "about", "summary", "objective", "links"}
SECTION_ALL        = SECTION_SKILLS | SECTION_EXPERIENCE | SECTION_EDUCATION | SECTION_CONTACT

DEGREE_KEYWORDS = {
    "b.tech", "b.e", "btech", "be", "m.tech", "mtech",
    "bsc", "b.sc", "msc", "m.sc", "mba", "phd", "ph.d",
    "bachelor", "master", "diploma", "associate", "b.com", "bca", "mca",
}


def _tok_low(t: str) -> str:
    return t.lower().strip(".,;:()[]{}\"'")


def prelabel_words(words: list[dict]) -> list[dict]:
    """
    Assign BIO labels to resume word tokens.
    Returns list of {"text", "box", "label"} dicts.
    """
    n      = len(words)
    labels = ["O"] * n

    in_skills_section  = False
    in_exp_section     = False
    in_edu_section     = False

    # ── Pass 1: section detection + simple entity labels ─────────────────────
    for i, w in enumerate(words):
        tok     = w["text"]
        tok_low = _tok_low(tok)

        if tok_low in SECTION_ALL or any(tok_low.startswith(s) for s in SECTION_ALL):
            in_skills_section  = tok_low in SECTION_SKILLS or any(tok_low.startswith(s) for s in SECTION_SKILLS)
            in_exp_section     = tok_low in SECTION_EXPERIENCE or any(tok_low.startswith(s) for s in SECTION_EXPERIENCE)
            in_edu_section     = tok_low in SECTION_EDUCATION or any(tok_low.startswith(s) for s in SECTION_EDUCATION)
            labels[i] = "O"
            continue

        if RE_EMAIL.match(tok):
            labels[i] = "B-EMAIL"; continue

        if RE_DATE_YEAR.match(tok) or RE_DATE_RANGE.match(tok) or RE_DATE_MONTH.match(tok):
            labels[i] = "B-ISSUE_DATE"; continue

        if in_skills_section and tok_low in SKILL_KEYWORDS:
            labels[i] = "B-SKILL"; continue
        if tok_low in SKILL_KEYWORDS and len(tok) > 1:
            labels[i] = "B-SKILL"; continue

    # ── Pass 2: holder name (top 15% of page 1, title/upper case) ────────────
    top_idx = [i for i, w in enumerate(words)
               if w["page"] == 0 and w["box"][1] < 150 and labels[i] == "O"]
    candidates = []
    for i in top_idx:
        tok = words[i]["text"]
        if (tok[0].isupper() and not tok.isupper()) or (tok.isupper() and len(tok) > 1):
            candidates.append(i)
        else:
            break
    for rank, idx in enumerate(candidates[:6]):
        labels[idx] = "B-HOLDER_NAME" if rank == 0 else "I-HOLDER_NAME"

    # ── Pass 3: organization detection ───────────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        tok_low = _tok_low(w["text"])
        if in_edu_section and any(kw in tok_low for kw in
                                   ["university", "college", "institute", "school",
                                    "academy", "iit", "nit", "engineering", "technology"]):
            labels[i] = "B-ORGANIZATION"
        if in_exp_section and w["text"][0].isupper() and len(w["text"]) > 3:
            if any(s in tok_low for s in [" inc", " ltd", " llc", " pvt", " corp",
                                           " co.", " technologies", " solutions", " systems"]):
                labels[i] = "B-ORGANIZATION"

    # ── Pass 4: degree / document title ──────────────────────────────────────
    for i, w in enumerate(words):
        if labels[i] != "O":
            continue
        if _tok_low(w["text"]) in DEGREE_KEYWORDS:
            labels[i] = "B-DOCUMENT_TITLE"
            j = i + 1
            while j < n and j < i + 5 and labels[j] == "O":
                if words[j]["text"].lower() in {"in", "of", "and"}:
                    labels[j] = "I-DOCUMENT_TITLE"
                elif words[j]["text"][0].isupper():
                    labels[j] = "I-DOCUMENT_TITLE"
                else:
                    break
                j += 1

    return [{"text": w["text"], "box": w["box"], "label": labels[i]}
            for i, w in enumerate(words)]
