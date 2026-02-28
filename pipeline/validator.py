from __future__ import annotations

import hashlib
import logging
from datetime import date, datetime

from src.models import RawLineItem, RawReceipt

logger = logging.getLogger(__name__)

MATH_TOLERANCE = 0.05  # 5%


def validate_receipts(receipts: list[RawReceipt]) -> list[RawReceipt]:
    seen_hashes: set[str] = set()
    validated: list[RawReceipt] = []

    for receipt in receipts:
        receipt = _check_duplicate(receipt, seen_hashes)
        receipt = _validate_dates(receipt)
        receipt = _validate_line_items(receipt)
        receipt = _check_receipt_total(receipt)
        receipt = _check_hallucination_ratio(receipt)
        receipt = _check_cross_validation(receipt)
        validated.append(receipt)

    return validated


def _check_duplicate(receipt: RawReceipt, seen: set[str]) -> RawReceipt:
    if not receipt.date and not receipt.total:
        return receipt  # insufficient data for dedup
    total_str = f"{receipt.total:.2f}" if receipt.total is not None else "none"
    items_str = "|".join(
        f"{i.description}:{i.quantity}:{i.unit_price}:{i.total}" for i in receipt.items
    )
    key = f"{receipt.supplier}|{receipt.date}|{total_str}|{items_str}"
    h = hashlib.sha256(key.encode()).hexdigest()[:16]

    if h in seen:
        logger.warning("duplicate_receipt", extra={"receipt": receipt.receipt_id, "hash": h})
        for item in receipt.items:
            item.confidence = "low"
        receipt.notes += " [DUPLICATE DETECTED]"
        receipt.is_duplicate = True
    seen.add(h)
    return receipt


def _validate_dates(receipt: RawReceipt) -> RawReceipt:
    if not receipt.date:
        return receipt

    try:
        d = receipt.date if isinstance(receipt.date, date) else datetime.strptime(receipt.date, "%Y-%m-%d").date()
        today = date.today()
        if d > today:
            receipt.notes += f" [FUTURE DATE: {receipt.date}]"
            logger.warning("future_date", extra={"receipt": receipt.receipt_id, "date": receipt.date})
        elif (today - d).days > 365:
            receipt.notes += f" [OLD DATE: {receipt.date}]"
    except ValueError:
        receipt.notes += f" [INVALID DATE FORMAT: {receipt.date}]"
    return receipt


def _validate_line_items(receipt: RawReceipt) -> RawReceipt:
    for item in receipt.items:
        _check_math(item, receipt.receipt_id)
        _check_negative(item, receipt.receipt_id)
        _check_zero_price(item, receipt.receipt_id)
    return receipt


def _check_math(item: RawLineItem, receipt_id: str) -> None:
    if item.quantity and item.unit_price and not item.is_tax_or_fee and item.total is not None:
        expected = item.quantity * item.unit_price
        actual = abs(item.total)
        if actual > 0 and abs(expected - actual) / actual > MATH_TOLERANCE:
            item.confidence = "low"
            logger.info(
                "math_mismatch",
                extra={
                    "receipt": receipt_id,
                    "item": item.description,
                    "expected": round(expected, 2),
                    "actual": round(actual, 2),
                },
            )


def _check_negative(item: RawLineItem, receipt_id: str) -> None:
    if item.total is not None and item.total < 0 and not item.is_discount:
        item.is_discount = True
        logger.info("negative_total_flagged_as_refund", extra={"receipt": receipt_id, "item": item.description})

    if item.quantity is not None and item.quantity < 0 and not item.is_discount:
        item.confidence = "low"
        logger.warning("negative_quantity", extra={
            "receipt": receipt_id, "item": item.description, "qty": item.quantity,
        })


def _check_zero_price(item: RawLineItem, receipt_id: str) -> None:
    if item.total == 0 and (item.quantity or 0) > 0 and not item.is_tax_or_fee:
        item.confidence = "low"
        logger.info("zero_price_item", extra={"receipt": receipt_id, "item": item.description})
    if item.unit_price is not None and item.unit_price == 0.0 and not item.is_tax_or_fee and not item.is_discount:
        item.confidence = "low"
        logger.info("zero_unit_price", extra={"receipt": receipt_id, "item": item.description})


def _check_receipt_total(receipt: RawReceipt) -> RawReceipt:
    if receipt.total is None:
        return receipt

    non_excluded = [i for i in receipt.items if not i.is_tax_or_fee]
    line_sum = sum(i.total for i in non_excluded if i.total is not None)
    if any(i.total is None for i in non_excluded):
        receipt.notes += " [MISSING LINE TOTALS]"

    # Compare line sum + tax to receipt total (receipt total is post-tax)
    expected = line_sum + (receipt.tax or 0)

    denominator = max(abs(receipt.total), 0.01)
    if abs(expected) > 0 or receipt.total > 0:
        diff_pct = abs(expected - receipt.total) / denominator
        if diff_pct > MATH_TOLERANCE:
            receipt.notes += f" [LINE SUM+TAX {expected:.2f} != TOTAL {receipt.total:.2f}]"
            logger.info(
                "receipt_total_mismatch",
                extra={
                    "receipt": receipt.receipt_id,
                    "line_sum_plus_tax": round(expected, 2),
                    "receipt_total": receipt.total,
                },
            )
    return receipt


def _check_hallucination_ratio(receipt: RawReceipt) -> RawReceipt:
    if not receipt.items:
        return receipt

    low_count = sum(1 for i in receipt.items if i.confidence == "low")
    ratio = low_count / len(receipt.items)

    if ratio > 0.5:
        receipt.notes += " [HIGH LOW-CONFIDENCE RATIO - POSSIBLE OCR HALLUCINATION]"
        logger.warning(
            "high_low_confidence_ratio",
            extra={"receipt": receipt.receipt_id, "ratio": round(ratio, 2)},
        )
    return receipt


def _check_cross_validation(receipt: RawReceipt) -> RawReceipt:
    """If cross-validation notes are present, downgrade confidence accordingly."""

    if not receipt.cross_validation_notes:
        return receipt

    # Append a warning if multiple discrepancies were found.
    if len(receipt.cross_validation_notes) >= 2:
        receipt.notes += " [XVAL DISCREPANCIES]"

        # If many discrepancies, mark each item as at most medium confidence.
        for item in receipt.items:
            if item.confidence == "high":
                item.confidence = "medium"

    return receipt
