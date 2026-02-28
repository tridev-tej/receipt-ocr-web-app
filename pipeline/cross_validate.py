"""Cross-validation helpers (Claude Vision vs PaddleOCR).

PaddleOCR acts as a sanity check — it can flag Claude but never override it.
Rule-based math consistency serves as tie-breaker.
"""

from __future__ import annotations

import asyncio
import logging
import re
import threading
from pathlib import Path
from typing import Any

import config

logger = logging.getLogger(__name__)

_NUMBER_RE = re.compile(r"-?\(?\d[\d.,]*\d\)?|\(?\d\)?")

_paddle_ocr: Any = None
_paddle_lock = threading.Lock()


def _get_paddle_ocr() -> Any:
    global _paddle_ocr
    with _paddle_lock:
        if _paddle_ocr is None:
            from paddleocr import PaddleOCR
            _paddle_ocr = PaddleOCR(use_angle_cls=True, lang="latin", show_log=False)
    return _paddle_ocr


def _paddle_extract_raw(image_path: Path) -> tuple[str, set[float]]:
    """Get raw text + all numbers from PaddleOCR."""
    ocr = _get_paddle_ocr()
    with _paddle_lock:
        result = ocr.ocr(str(image_path), cls=True)

    lines: list[str] = []
    numbers: set[float] = set()

    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            lines.append(text)
            for n in _extract_numbers(text):
                numbers.add(n)

    return "\n".join(lines), numbers


def _extract_numbers(text: str) -> list[float]:
    """Extract all numeric values from text, handling various formats.

    Supports: plain (42), decimal (3.50), European comma-decimal (3,50),
    thousand-separated (1,500 / 1.500), mixed American (1,234.56),
    mixed European (1.234,56), and parenthesised negatives ((3.00)).
    """
    results: list[float] = []
    for m in _NUMBER_RE.findall(text):
        clean = m.strip("()")
        if not clean:
            continue
        if "," in clean and "." in clean:
            last_comma, last_dot = clean.rfind(","), clean.rfind(".")
            clean = clean.replace(".", "").replace(",", ".") if last_comma > last_dot else clean.replace(",", "")
        elif "," in clean:
            parts = clean.split(",")
            if len(parts[-1]) <= 2:
                clean = clean.replace(",", ".")
            elif re.match(r'^[1-9]\d{0,2}(,\d{3})+$', clean):
                clean = clean.replace(",", "")
            else:
                clean = clean.replace(",", ".")
        elif "." in clean and re.match(r'^[1-9]\d{0,2}(\.\d{3})+$', clean):
            clean = clean.replace(".", "")
        try:
            val = float(clean)
            if "(" in m:
                val = -val
            results.append(val)
        except ValueError:
            pass
    return results


def _number_in_set(target: float, numbers: set[float], tolerance: float | None = None) -> bool:
    """Check if target appears in extracted numbers within tolerance."""
    if tolerance is None:
        tolerance = config.XVAL_NUMBER_TOLERANCE
    if abs(target) < 0.01:
        return False
    return any(abs(n - target) <= abs(target) * tolerance for n in numbers)


def _fuzzy_text_match(needle: str, haystack: str, threshold: int = 55) -> bool:
    """Token-overlap match ignoring short tokens (numbers, punctuation, store IDs)."""
    needle_tokens: set[str] = set()
    for raw in needle.upper().split():
        clean = re.sub(r"[^A-Z0-9]", "", raw).strip()
        if clean and len(clean) >= 3 and not clean.isdigit():
            needle_tokens.add(clean)
    haystack_upper = haystack.upper()
    if not needle_tokens:
        return True
    matched = sum(1 for t in needle_tokens if t in haystack_upper)
    return (matched / len(needle_tokens) * 100) >= threshold


def _claude_math_consistent(data: dict[str, Any]) -> bool:
    """Check if Claude's own numbers are internally consistent."""
    line_items = data.get("line_items") or []
    non_tax = [i for i in line_items if isinstance(i, dict) and not i.get("is_tax_or_fee")]
    line_sum = sum(i.get("total") or 0 for i in non_tax)

    subtotal = data.get("subtotal")
    tax = data.get("tax")
    total = data.get("total")

    if subtotal is not None and abs(line_sum - subtotal) / max(abs(subtotal), 0.01) > 0.10:
        return False

    if subtotal is not None and tax is not None and total is not None:
        expected = subtotal + tax
        if abs(expected - total) / max(abs(total), 0.01) > 0.05:
            return False

    return True


async def cross_validate(
    image_path: Path, data: dict[str, Any]
) -> tuple[list[str], float]:
    """Cross-validate Claude extraction against PaddleOCR.

    Returns (discrepancy_notes, confidence_multiplier).
    Uses PaddleOCR as sanity check with rule-based math as tie-breaker.
    """
    try:
        paddle_text, paddle_numbers = await asyncio.to_thread(
            _paddle_extract_raw, image_path
        )
    except Exception as e:
        logger.warning("xval_paddle_extract_failed", extra={"error": str(e)})
        return [], 1.0

    if not paddle_text.strip() and not paddle_numbers:
        logger.warning("xval_paddle_empty_evidence")
        return [], 1.0

    notes: list[str] = []
    penalties = 0
    checks = 0

    # Receipt total
    claude_total = data.get("total")
    if isinstance(claude_total, (int, float)):
        checks += 1
        if not _number_in_set(float(claude_total), paddle_numbers):
            if not _claude_math_consistent(data):
                notes.append(f"[XVAL] Total {claude_total} not in PaddleOCR + math inconsistent")
                penalties += 1
            else:
                notes.append(f"[XVAL] Total {claude_total} not in PaddleOCR (math OK, minor)")

    # Supplier name
    claude_supplier: str = data.get("supplier", "")
    if claude_supplier:
        checks += 1
        paddle_header = "\n".join(paddle_text.split("\n")[:3])
        if not _fuzzy_text_match(claude_supplier, paddle_header, threshold=55):
            notes.append(f"[XVAL] Supplier '{claude_supplier}' not confirmed by PaddleOCR")
            penalties += 1

    # Line item totals (skip tax items)
    for item in (data.get("line_items") or []):
        if not isinstance(item, dict):
            continue
        item_total = item.get("total")
        if item_total is not None and not item.get("is_tax_or_fee"):
            try:
                item_total = float(item_total)
            except (TypeError, ValueError):
                continue
            checks += 1
            if not _number_in_set(item_total, paddle_numbers):
                qty = item.get("quantity")
                price = item.get("unit_price")
                try:
                    qty_f = float(qty) if qty is not None else None
                    price_f = float(price) if price is not None else None
                except (TypeError, ValueError):
                    qty_f, price_f = None, None
                math_ok = (
                    qty_f is not None and price_f is not None
                    and abs(qty_f * price_f - item_total) / max(abs(item_total), 0.01) < 0.05
                )
                if not math_ok:
                    notes.append(
                        f"[XVAL] '{item.get('description', '?')}' total {item_total} "
                        f"not in PaddleOCR + math fail"
                    )
                    penalties += 1

    if checks == 0:
        return notes, 1.0

    multiplier = max(config.XVAL_MULTIPLIER_FLOOR, 1.0 - (penalties / checks) * 0.5)
    return notes, multiplier
