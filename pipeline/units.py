"""Shared unit conversion tables.

Single source of truth for mass, volume, and count conversions used by both
the normalizer (receipt line items) and the calculator (recipe quantities).
"""

from __future__ import annotations

MASS_TO_GRAMS: dict[str, float] = {
    "kg": 1000, "kgs": 1000, "g": 1, "grams": 1, "gram": 1,
    "oz": 28.35, "ounce": 28.35, "ounces": 28.35,
    "lb": 453.592, "lbs": 453.592, "pound": 453.592, "pounds": 453.592,
    "kilogram": 1000, "kilograms": 1000, "kilo": 1000, "kilos": 1000,
}

VOLUME_TO_ML: dict[str, float] = {
    "l": 1000, "ml": 1, "dl": 100, "cl": 10, "fl oz": 29.57, "floz": 29.57, "fl_oz": 29.57,
    "litre": 1000, "liter": 1000, "litres": 1000, "liters": 1000,
    "gal": 3785.41, "gallon": 3785.41, "gallons": 3785.41,
    "qt": 946.35, "quart": 946.35, "quarts": 946.35,
    "pt": 473.18, "pint": 473.18, "pints": 473.18,
}

COUNT_UNITS: dict[str, float] = {
    "each": 1, "piece": 1, "pc": 1, "pcs": 1, "dozen": 12,
    "unit": 1, "units": 1, "slice": 1, "slices": 1, "bunch": 1,
    "box": 1, "pack": 1, "case": 1, "bag": 1, "can": 1,
}


def to_base_unit(qty: float, unit: str) -> tuple[float, str]:
    """Convert qty+unit to base unit (grams, ml, or each).

    Returns (converted_qty, base_unit). Unknown units pass through as "each".
    """
    if not isinstance(qty, (int, float)):
        try:
            qty = float(qty)
        except (ValueError, TypeError):
            return 0.0, "each"

    if not isinstance(unit, str) or not unit.strip():
        return float(qty), "each"

    u = unit.lower().strip()

    if u in MASS_TO_GRAMS:
        return qty * MASS_TO_GRAMS[u], "g"
    if u in VOLUME_TO_ML:
        return qty * VOLUME_TO_ML[u], "ml"
    if u in COUNT_UNITS:
        return qty * COUNT_UNITS[u], "each"

    return qty, "each"
