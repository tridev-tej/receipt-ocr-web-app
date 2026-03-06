from __future__ import annotations

import logging
import re
from typing import Literal

from models import NormalizedLineItem

logger = logging.getLogger(__name__)

def _word_match(keyword: str, text: str) -> bool:
    """Match keyword with word boundaries to avoid substring false positives."""
    return bool(re.search(r"\b" + re.escape(keyword) + r"\b", text))

INGREDIENT_KEYWORDS = {
    "coffee", "beans", "espresso", "arabica", "robusta",
    "cocoa", "chocolate", "chocolat", "cacao",
    "milk", "dairy", "cream", "oat milk", "almond milk", "almond", "soy milk",
    "sugar", "sweetener", "honey", "syrup", "agave",
    "lemon", "lemons", "lime", "citrus", "orange", "fruit",
    "mint", "herb", "basil",
    "berry", "berries", "blueberry", "blueberries", "raspberry", "strawberry",
    "avocado", "avocados",
    "ethiopian",
    "bread", "sourdough", "loaf", "slice", "baguette",
    "salt", "pepper", "spice",
    "croissant", "croissants", "pastry", "muffin", "muffins", "cake", "scone",
    "flour", "butter", "egg", "vanilla",
    "blend", "decaf",
    # German
    "kaffeebohnen", "kakaopulver", "zucker", "vanillezucker",
    "milch", "vollmilch", "hafermilch", "sahne",
    "honig", "zitrone", "minze", "brot",
    # French
    "cafe", "lait", "sucre", "miel", "citron", "menthe",
    "beurre", "myrtille", "pain",
    # Spanish
    "leche", "azucar", "limon", "granos",
    "cruasanes", "cruasan", "magdalena",
}

PACKAGING_KEYWORDS = {
    "cup", "cups", "lid", "lids",
    "straw", "straws", "napkin", "napkins",
    "bag", "bags", "paper bag",
    "container", "takeaway", "take-away",
    "sleeve", "wrap", "wrapper",
    "8oz", "12oz", "16oz",
    "becher", "deckel", "gobelet", "vaso", "tapa",
}

EXCLUDE_KEYWORDS = {
    # English
    "cleaning", "cleaner", "detergent", "soap", "sanitizer",
    "sponge", "brush", "mop", "broom",
    "delivery", "shipping", "freight", "transport", "fuel surcharge",
    "maintenance", "repair", "service charge",
    "decor", "decoration", "display",
    "equipment", "machine", "grinder",
    "uniform", "apron",
    "insurance", "rent", "utilities",
    "tip", "gratuity", "discount", "coupon", "voucher",
    "deposit", "refund", "credit note",
    "subtotal", "total", "vat", "tax", "mwst", "tva", "iva",
    # German
    "reinigung", "reiniger", "seife", "spulmittel",
    "lieferung", "versand", "fracht", "zustellung",
    "reparatur", "wartung", "pfand",
    "rabatt", "gutschein", "trinkgeld",
    # French
    "nettoyage", "nettoyant", "savon",
    "livraison", "expedition", "transport",
    "reparation", "entretien", "pourboire",
    "remise", "reduction",
    # Spanish
    "limpieza", "limpiador", "jabon",
    "envio", "entrega", "transporte",
    "reparacion", "mantenimiento", "propina",
    "descuento", "reembolso",
}


def _fuzzy_keyword_match(text: str) -> tuple[str | None, int]:
    """Fuzzy keyword fallback for OCR noise. Priority: exclude > packaging > ingredient."""
    from thefuzz import fuzz

    _MIN_KEYWORD_LEN = 4
    scores: dict[str, int] = {"exclude": 0, "packaging": 0, "ingredient": 0}
    for keyword in EXCLUDE_KEYWORDS:
        if len(keyword) >= _MIN_KEYWORD_LEN:
            scores["exclude"] = max(scores["exclude"], fuzz.partial_ratio(keyword, text))
    for keyword in PACKAGING_KEYWORDS:
        if len(keyword) >= _MIN_KEYWORD_LEN:
            scores["packaging"] = max(scores["packaging"], fuzz.partial_ratio(keyword, text))
    for keyword in INGREDIENT_KEYWORDS:
        if len(keyword) >= _MIN_KEYWORD_LEN:
            scores["ingredient"] = max(scores["ingredient"], fuzz.partial_ratio(keyword, text))

    for cat in ("exclude", "packaging", "ingredient"):
        if scores[cat] >= 80:
            return cat, scores[cat]
    return None, 0


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

    # Fuzzy keyword fallback for OCR noise
    best_cat, best_score = _fuzzy_keyword_match(desc_lower)
    if best_cat and best_score >= 80:
        return best_cat, round(best_score / 100, 2)

    # Check for common patterns (unit-based heuristic, lower confidence)
    if any(t in tokens for t in ("kg", "g", "ml", "l", "liter", "litre")):
        return "ingredient", 0.6

    return "unknown", 0.0
