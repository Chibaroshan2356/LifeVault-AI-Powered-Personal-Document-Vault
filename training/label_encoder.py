"""Label mapping and BIO encoding configuration."""
import json
import os

LABELS = [
    "O",
    "B-HOLDER_NAME", "I-HOLDER_NAME",
    "B-ORGANIZATION", "I-ORGANIZATION",
    "B-DOCUMENT_NUMBER", "I-DOCUMENT_NUMBER",
    "B-ISSUE_DATE", "I-ISSUE_DATE",
    "B-EXPIRY_DATE", "I-EXPIRY_DATE",
    "B-DATE_OF_BIRTH", "I-DATE_OF_BIRTH",
    "B-DOCUMENT_TITLE", "I-DOCUMENT_TITLE",
    "B-TOTAL_AMOUNT", "I-TOTAL_AMOUNT",
    "B-NATIONALITY", "I-NATIONALITY",
    "B-EMAIL", "I-EMAIL",
    "B-SKILL", "I-SKILL",
    "B-INSURANCE_COMPANY", "I-INSURANCE_COMPANY",
    "B-PROVIDER_NAME", "I-PROVIDER_NAME",
    "B-GENDER", "I-GENDER",
    "B-ADDRESS", "I-ADDRESS",
    "B-FATHER_NAME", "I-FATHER_NAME"
]

LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = {i: label for i, label in enumerate(LABELS)}


def get_label_maps():
    return LABEL2ID, ID2LABEL


def export_label_map(output_dir):
    """Saves label_map.json containing label mappings for inference mapping."""
    os.makedirs(output_dir, exist_ok=True)
    mapping = {
        "label2id": LABEL2ID,
        "id2label": {str(k): v for k, v in ID2LABEL.items()}  # JSON keys must be strings
    }
    path = os.path.join(output_dir, "label_map.json")
    with open(path, "w") as f:
        json.dump(mapping, f, indent=2)
    return path
