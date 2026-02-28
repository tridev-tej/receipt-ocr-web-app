from __future__ import annotations

import logging
import re

import config
from models import NormalizedLineItem, RawLineItem, RawReceipt
from units import to_base_unit
from utils import parse_number

logger = logging.getLogger(__name__)

PACK_PATTERNS = [
    # "pack/500", "box/1000", "(pack/250)", "boite/24", "caja/12"
    re.compile(r"(?:box|pack|case|carton|boite|caja)\s*/\s*(\d+)", re.IGNORECASE),
    # "pack of 500", "box of 100", "case 24"
    re.compile(r"(?:box|pack|case|carton|boite|caja)\s+(?:of|de)?\s*(\d+)", re.IGNORECASE),
    # "6 pack", "12 pack" (without dash)
    re.compile(r"\b(\d+)\s+pack\b", re.IGNORECASE),
    # "500-pack", "24x pack", "6×pack"
    re.compile(r"(\d+)\s*[-x×]\s*pack", re.IGNORECASE),
    # "500pcs", "100 pieces", "24ct"
    re.compile(r"(\d+)\s*(?:pcs|pieces|units|ct)\b", re.IGNORECASE),
]

# Extract embedded weight/volume from descriptions like "(1kg)", "(500ml)", "(1L)", "(1Lt)"
_EMBEDDED_UNIT_RE = re.compile(
    r"\(?\b(\d+(?:[.,]\d+)?)\s*(kg|kgs|g|grams?|oz|lb|lbs|l|lt|ml|dl|cl)\b\)?",
    re.IGNORECASE,
)


def normalize_receipts(receipts: list[RawReceipt]) -> list[NormalizedLineItem]:
    if not receipts:
        logger.info("normalize_empty_input", extra={"reason": "no receipts to normalize"})
        return []

    normalized: list[NormalizedLineItem] = []
    for receipt in receipts:
        for item in receipt.items:
            if item.is_tax_or_fee:
                continue
            norm = _normalize_item(item, receipt)
            if receipt.is_duplicate:
                norm.flagged = True
                if "duplicate_receipt" not in norm.flag_reasons:
                    norm.flag_reasons.append("duplicate_receipt")
            normalized.append(norm)
    return normalized


def _normalize_item(item: RawLineItem, receipt: RawReceipt) -> NormalizedLineItem:
    flags: list[str] = []

    # Infer missing total from qty × unit_price when possible
    raw_total: float
    if item.total is not None:
        raw_total = item.total
    elif item.quantity is not None and item.unit_price is not None:
        raw_total = item.quantity * item.unit_price
        flags.append("total_inferred")
    else:
        raw_total = 0.0
        flags.append("missing_total")

    raw_unit_price = item.unit_price if item.unit_price is not None else 0.0
    if item.unit_price is None:
        flags.append("missing_unit_price")

    total_eur, currency_known = _convert_currency(raw_total, receipt.currency)
    unit_price_eur, _ = _convert_currency(raw_unit_price, receipt.currency)

    if not currency_known:
        flags.append(f"unknown_currency:{receipt.currency}")

    if item.quantity is not None:
        qty = item.quantity
    else:
        qty = 1.0
        flags.append("qty_defaulted")

    # Guard: negative quantities are data errors — take absolute value and flag
    if qty < 0:
        logger.warning(
            "negative_quantity",
            extra={
                "receipt": receipt.receipt_id,
                "item": item.description,
                "qty": qty,
            },
        )
        qty = abs(qty)
        flags.append("negative_quantity_corrected")

    unit = (item.unit or "each").lower().strip()

    # Parse pack sizes FIRST — must happen before downscale heuristic so
    # "Box of 100 cups, total=50" isn't mistakenly divided by 100.
    pack_size = _detect_pack_size(item.description)
    if pack_size and pack_size > 1:
        qty = qty * pack_size
        if unit in ("each", "pack", "box", "case", "carton"):
            unit = "each"
        else:
            logger.warning(
                "pack_size_unit_conflict",
                extra={
                    "description": item.description,
                    "existing_unit": unit,
                    "pack_size": pack_size,
                },
            )
        if total_eur > 0 and qty > 0:
            unit_price_eur = total_eur / qty

    # Sanity check for comma-decimal mis-parse: if total looks 100x too high
    # relative to unit_price * qty, it was likely "3,50" parsed as 350.
    # Applied AFTER pack expansion so pack items aren't incorrectly downscaled.
    expected = unit_price_eur * qty if unit_price_eur > 0 and qty > 0 else 0
    if expected > 0 and total_eur > expected * 50:
        total_eur = total_eur / 100.0
        flags.append("decimal_downscale_applied")
    if qty > 0 and unit_price_eur > total_eur * 50 and total_eur > 0:
        unit_price_eur = unit_price_eur / 100.0
        if "decimal_downscale_applied" not in flags:
            flags.append("decimal_downscale_applied")

    # Extract embedded weight/volume from description when unit is "each"
    # e.g. "Oat Milk Barista (1L)" with unit=each → convert to ml
    # Skip for packaging items where sizes are capacity specs, not product weight
    _packaging_keywords = {"cup", "lid", "straw", "napkin", "bag"}
    desc_lower = item.description.lower()
    is_packaging = any(kw in desc_lower for kw in _packaging_keywords)
    if not is_packaging and unit in ("each", "pack", "box", "bag", "case", "bunch"):
        embedded = _extract_embedded_unit(item.description)
        if embedded:
            emb_val, emb_unit = embedded
            qty = qty * emb_val
            unit = emb_unit

    # Handle compound units like "10l", "500ml", "6pk" where OCR merged number+unit
    compound = re.match(r"^(\d+(?:\.\d+)?)\s*(kg|g|l|lt|ml|dl|cl|oz|lb|pk|pcs?)$", unit, re.IGNORECASE)
    if compound:
        embedded_qty = float(compound.group(1))
        embedded_unit = compound.group(2).lower()
        if embedded_unit == "lt":
            embedded_unit = "l"
        elif embedded_unit in ("pk", "pcs"):
            embedded_unit = "each"
        qty = qty * embedded_qty
        unit = embedded_unit

    qty_norm, unit_norm = to_base_unit(qty, unit)

    if unit_price_eur == 0 and total_eur > 0 and qty > 0:
        unit_price_eur = total_eur / qty

    # Derive normalized unit price
    unit_price_per_base = 0.0
    if qty_norm > 0:
        unit_price_per_base = total_eur / qty_norm

    if item.total is not None and item.total < 0:
        flags.append("refund_or_credit")
    if item.confidence == "low":
        flags.append("low_ocr_confidence")

    # Use per-item confidence when available, falling back to receipt-level
    _conf_map = {"high": 1.0, "medium": 0.7, "low": 0.4}
    item_confidence = _conf_map.get(item.confidence, receipt.ocr_confidence)

    return NormalizedLineItem(
        receipt_id=receipt.receipt_id,
        raw_description=item.description,
        raw_quantity=item.quantity,
        raw_unit=item.unit,
        is_tax_or_fee=item.is_tax_or_fee,
        is_discount=item.is_discount,
        is_refund=bool(item.total is not None and item.total < 0 and not item.is_discount),
        ocr_confidence=item_confidence,
        category="unknown",
        quantity_normalized=qty_norm,
        unit_normalized=unit_norm,
        unit_price_eur=unit_price_per_base,
        total_eur=total_eur,
        flagged=len(flags) > 0,
        flag_reasons=flags,
    )


def _convert_currency(amount: float, currency: str) -> tuple[float, bool]:
    """Convert amount to EUR. Returns (eur_amount, currency_known)."""
    if currency == "UNKNOWN":
        logger.warning("unknown_currency_treating_as_eur", extra={"currency": currency})
        return amount * 1.0, False
    rate = config.EUR_RATES.get(currency.upper())
    if rate is None:
        logger.warning("unknown_currency_treating_as_eur", extra={"currency": currency})
        return amount * 1.0, False
    return amount * rate, True


def _extract_embedded_unit(description: str) -> tuple[float, str] | None:
    """Extract weight/volume embedded in description like '(1L)', '(500ml)', '(1kg)'."""
    m = _EMBEDDED_UNIT_RE.search(description)
    if not m:
        return None
    val = parse_number(m.group(1))
    if val is None:
        return None
    unit = m.group(2).lower()
    # Normalize "lt" → "l"
    if unit == "lt":
        unit = "l"
    return val, unit


def _detect_pack_size(description: str) -> int | None:
    for pattern in PACK_PATTERNS:
        match = pattern.search(description)
        if match:
            try:
                return int(match.group(1))
            except (ValueError, IndexError):
                continue
    return None
