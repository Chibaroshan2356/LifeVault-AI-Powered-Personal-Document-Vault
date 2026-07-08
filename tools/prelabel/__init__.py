"""
tools/prelabel/__init__.py
==========================
Pre-label plugin registry for the LifeVault dataset preparation framework.

Each module in this package must expose a single function:
    prelabel_words(words: list[WordBox]) -> list[dict]

Where WordBox = {"text": str, "box": [x0,y0,x1,y1], "page": int}
And the returned dicts are {"text": str, "box": list, "label": str}
"""

import importlib
import logging

logger = logging.getLogger(__name__)

SUPPORTED_CATEGORIES = ["resume", "certificate", "pan", "aadhaar", "student_id",
                        "passport", "medical", "insurance", "internship", "fee_receipts"]


def get_prelabeler(category: str):
    """
    Dynamically load and return the prelabel_words function for a given category.

    Args:
        category: Lowercase category name (e.g. "resume", "certificate").

    Returns:
        A callable: prelabel_words(words) -> list[dict]

    Raises:
        ValueError if the category is not supported or module not found.
    """
    module_name = f"prelabel.{category.lower().replace(' ', '_')}"
    try:
        mod = importlib.import_module(module_name)
    except ModuleNotFoundError:
        raise ValueError(
            f"No prelabeler found for category '{category}'. "
            f"Create tools/prelabel/{category.lower()}.py with a prelabel_words() function."
        )

    if not hasattr(mod, "prelabel_words"):
        raise ValueError(
            f"Module '{module_name}' does not expose a prelabel_words() function."
        )

    return mod.prelabel_words
