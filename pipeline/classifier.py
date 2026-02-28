from __future__ import annotations

import logging
import re
from typing import Literal

from src.models import NormalizedLineItem

logger = logging.getLogger(__name__)

def _word_match(keyword: str, text: str) -> bool:
    """Match keyword with word boundaries to avoid substring false positives."""
    return bool(re.search(r"\b" + re.escape(keyword) + r"\b", text))

INGREDIENT_KEYWORDS = {
    "coffee", "beans", "espresso", "arabica", "robusta",
    "cocoa", "chocolate", "cacao",
    "milk", "dairy", "cream", "oat milk", "almond milk", "soy milk",
    "sugar", "sweetener", "honey", "syrup", "agave",
    "lemon", "lime", "citrus", "orange", "fruit",
    "mint", "herb", "basil",
    "berry", "berries", "blueberry", "raspberry", "strawberry",
    "avocado",
    "bread", "sourdough", "loaf", "slice",
    "salt", "pepper", "spice",
    "croissant", "pastry", "muffin", "cake", "scone",
    "flour", "butter", "egg", "vanilla",
}

PACKAGING_KEYWORDS = {
    "cup", "cups", "lid", "lids",
    "straw", "straws", "napkin", "napkins",
    "bag", "bags", "paper bag",
    "container", "takeaway", "take-away",
    "sleeve", "wrap", "wrapper",
    "8oz", "12oz", "16oz",
}

EXCLUDE_KEYWORDS = {
    "cleaning", "cleaner", "detergent", "soap", "sanitizer",
    "sponge", "brush", "mop", "broom",
    "delivery", "shipping", "freight", "transport", "fuel surcharge",
    "maintenance", "repair", "service",
    "decor", "decoration", "display",
    "equipment", "machine", "grinder",
    "uniform", "apron",
    "insurance", "rent", "utilities",
    "tip", "gratuity",
}


LOW_OCR_CONFIDENCE_THRESHOLD = 0.5


def classify_items(items: list[NormalizedLineItem]) -> list[NormalizedLineItem]:
    for item in items:
        category, confidence = _classify_single(item.raw_description)
        item.category = category
        item.mapping_confidence = confidence

        if item.ocr_confidence < LOW_OCR_CONFIDENCE_THRESHOLD:
            item.flagged = True
            item.flag_reasons.append("low_ocr_confidence: classification may be unreliable")

    return items


def _classify_single(
    description: str,
) -> tuple[Literal["ingredient", "packaging", "exclude", "unknown"], float]:
    desc_lower = description.lower()
    tokens = set(desc_lower.split())

    # Check exclude first (highest priority)
    for keyword in EXCLUDE_KEYWORDS:
        if _word_match(keyword, desc_lower):
            return "exclude", 1.0

    # Check packaging
    for keyword in PACKAGING_KEYWORDS:
        if _word_match(keyword, desc_lower):
            return "packaging", 1.0

    # Check ingredients
    for keyword in INGREDIENT_KEYWORDS:
        if _word_match(keyword, desc_lower):
            return "ingredient", 1.0

    # Check for common patterns (unit-based heuristic, lower confidence)
    if any(t in tokens for t in ("kg", "g", "ml", "l", "liter", "litre")):
        return "ingredient", 0.6

    return "unknown", 0.0
