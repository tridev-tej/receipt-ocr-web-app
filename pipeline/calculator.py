from __future__ import annotations

import json
import logging
import math
import statistics
from pathlib import Path
from typing import Any

import config
from src.models import IngredientCost, MenuItemCost, NormalizedLineItem
from src.units import to_base_unit

logger = logging.getLogger(__name__)

CONFIDENCE_NUMERIC = {"high": 1.0, "medium": 0.7, "low": 0.4}


def load_menu(path: Path | None = None) -> dict[str, Any]:
    menu_path = path or config.MENU_PATH
    result: dict[str, Any] = json.loads(menu_path.read_text())
    return result


def calculate_ingredient_costs(
    items: list[NormalizedLineItem],
    menu: dict[str, Any],
) -> list[IngredientCost]:
    ingredients_def = menu.get("ingredients", {})
    grouped: dict[str, list[NormalizedLineItem]] = {}

    for item in items:
        if not item.mapped_ingredient or item.category == "exclude":
            continue
        if item.total_eur <= 0:
            continue
        if "refund_or_credit" in item.flag_reasons:
            continue
        if "duplicate_receipt" in item.flag_reasons:
            continue
        grouped.setdefault(item.mapped_ingredient, []).append(item)

    costs: list[IngredientCost] = []
    for ingredient_id, ingredient_items in grouped.items():
        cost = _compute_ingredient_cost(ingredient_id, ingredient_items, ingredients_def)
        if cost:
            costs.append(cost)

    return costs


def _compute_ingredient_cost(
    ingredient_id: str,
    items: list[NormalizedLineItem],
    ingredients_def: dict[str, Any],
) -> IngredientCost | None:
    if not items:
        return None

    display_name = ingredients_def.get(ingredient_id, {}).get("display_name", ingredient_id)
    unit = ingredients_def.get(ingredient_id, {}).get("unit", "each")

    # Filter to items with matching normalized unit to avoid mixing ml and "each"
    target_unit = unit  # from ingredient definition (e.g. "ml", "g", "each")
    matched = [i for i in items if i.unit_normalized == target_unit]
    if not matched:
        # Fallback: try converting items with compatible units (e.g., L→ml, kg→g)
        converted: list[NormalizedLineItem] = []
        for i in items:
            conv_qty, conv_unit = to_base_unit(i.quantity_normalized, i.unit_normalized)
            if conv_unit == target_unit and conv_qty > 0:
                converted.append(i.model_copy(update={
                    "quantity_normalized": conv_qty,
                    "unit_normalized": conv_unit,
                }))
        if converted:
            logger.warning(
                "ingredient=%s: no exact unit match for '%s', used %d unit-converted items",
                ingredient_id, target_unit, len(converted),
            )
            matched = converted
        else:
            logger.warning(
                "ingredient=%s: no items with compatible unit '%s', skipping",
                ingredient_id, target_unit,
            )
            return None

    # Compute unit costs — weight combines mapping confidence and OCR confidence
    unit_costs: list[tuple[float, float, NormalizedLineItem]] = []  # (unit_cost, weight, item)
    for item in matched:
        if item.quantity_normalized <= 0:
            continue
        if not (math.isfinite(item.total_eur) and math.isfinite(item.quantity_normalized)):
            continue
        uc = item.total_eur / item.quantity_normalized
        if item.ocr_confidence < 0.6:
            ocr_numeric = CONFIDENCE_NUMERIC["low"]
        elif item.ocr_confidence < 0.8:
            ocr_numeric = CONFIDENCE_NUMERIC["medium"]
        else:
            ocr_numeric = CONFIDENCE_NUMERIC["high"]
        weight = item.mapping_confidence * ocr_numeric
        unit_costs.append((uc, weight, item))

    if not unit_costs:
        return None

    # IQR outlier removal — filter by bounds, not value identity
    costs_only = [c for c, _, _ in unit_costs]
    lower, upper = _iqr_bounds(costs_only)
    remaining = [(uc, w, it) for uc, w, it in unit_costs if lower <= uc <= upper]

    if not remaining:
        remaining = unit_costs  # fallback if IQR removes everything

    # Weighted average
    total_weight = sum(w for _, w, _ in remaining)
    if total_weight == 0:
        avg = statistics.mean([c for c, _, _ in remaining])
    else:
        avg = sum(c * w for c, w, _ in remaining) / total_weight

    all_costs = [c for c, _, _ in remaining]
    min_cost = min(all_costs)
    max_cost = max(all_costs)
    std_dev = statistics.stdev(all_costs) if len(all_costs) > 1 else 0.0

    # Collect source_receipts from items that survived IQR filtering
    source_receipts = list({it.receipt_id for _, _, it in remaining})
    cv = std_dev / avg if avg > 0 else 0.0
    remaining_items = [it for _, _, it in remaining]
    confidence = _compute_confidence(len(remaining), remaining_items, cv=cv)

    return IngredientCost(
        ingredient_id=ingredient_id,
        display_name=display_name,
        avg_cost_per_unit=round(avg, 6),
        unit=unit,
        min_cost=round(min_cost, 6),
        max_cost=round(max_cost, 6),
        std_dev=round(std_dev, 6),
        num_data_points=len(remaining),
        confidence=round(confidence, 3),
        source_receipts=source_receipts,
    )


def _iqr_bounds(values: list[float]) -> tuple[float, float]:
    if len(values) < 4:
        return (min(values), max(values))

    q1, _, q3 = statistics.quantiles(values, n=4)
    iqr = q3 - q1

    lower = q1 - config.IQR_K * iqr
    upper = q3 + config.IQR_K * iqr
    return (lower, upper)


def _compute_confidence(
    num_points: int, items: list[NormalizedLineItem], cv: float = 0.0
) -> float:
    if num_points == 0:
        return 0.0

    avg_mapping = sum(i.mapping_confidence for i in items) / len(items) if items else 0.5
    avg_ocr = sum(i.ocr_confidence for i in items) / len(items) if items else 0.5
    volume_factor = min(1.0, num_points / 5.0)
    raw = volume_factor * avg_mapping * avg_ocr

    # Penalize high cost variation — if CV > 30%, reduce confidence proportionally
    # This prevents over-confident scores when ingredient prices vary widely
    if cv > 0.3:
        spread_penalty = max(0.5, 1.0 - (cv - 0.3))
        raw *= spread_penalty

    return round(max(0.0, min(0.95, raw)), 4)


def calculate_menu_costs(
    ingredient_costs: list[IngredientCost],
    menu: dict[str, Any],
) -> list[MenuItemCost]:
    cost_lookup: dict[str, IngredientCost] = {c.ingredient_id: c for c in ingredient_costs}
    menu_items = menu.get("menu_items", [])
    results: list[MenuItemCost] = []

    # First pass: non-combo items
    item_cost_lookup: dict[str, MenuItemCost] = {}
    for mi in menu_items:
        if "combo_of" in mi:
            continue
        result = _cost_menu_item(mi, cost_lookup)
        results.append(result)
        item_cost_lookup[mi["id"]] = result

    # Second pass: combos
    for mi in menu_items:
        if "combo_of" not in mi:
            continue
        result = _cost_combo(mi, item_cost_lookup)
        results.append(result)

    return results


def _cost_menu_item(mi: dict[str, Any], cost_lookup: dict[str, IngredientCost]) -> MenuItemCost:
    sell_price = mi["sell_price"]
    recipe = mi.get("recipe", {})
    packaging = mi.get("packaging", {})
    flags: list[str] = []
    breakdown: list[dict[str, Any]] = []
    has_missing = False

    ingredient_cost = 0.0
    cost_conf_pairs: list[tuple[float, float]] = []

    for ingredient_id, spec in recipe.items():
        qty = spec["qty"]
        unit = spec["unit"]

        if ingredient_id not in cost_lookup:
            flags.append(f"missing_data:{ingredient_id}")
            breakdown.append({
                "ingredient": ingredient_id,
                "qty": qty,
                "unit": unit,
                "cost": 0.0,
                "note": "no data",
            })
            has_missing = True
            continue

        ic = cost_lookup[ingredient_id]
        qty_base, base_unit = to_base_unit(qty, unit)
        if base_unit != ic.unit:
            flags.append(f"unit_mismatch:{ingredient_id}:{unit}!={ic.unit}")
            breakdown.append({
                "ingredient": ingredient_id,
                "qty": qty,
                "unit": unit,
                "cost": 0.0,
                "note": f"unit mismatch: recipe uses {unit}, cost data in {ic.unit}",
            })
            has_missing = True
            continue
        cost = qty_base * ic.avg_cost_per_unit
        ingredient_cost += cost
        cost_conf_pairs.append((cost, ic.confidence))

        breakdown.append({
            "ingredient": ingredient_id,
            "qty": qty,
            "unit": unit,
            "unit_cost": round(ic.avg_cost_per_unit, 4),
            "cost": round(cost, 4),
        })

    packaging_cost = 0.0
    for pkg_id, spec in packaging.items():
        qty = spec["qty"]
        pkg_unit = spec.get("unit", "each")
        if pkg_id in cost_lookup:
            ic = cost_lookup[pkg_id]
            # Convert packaging qty to match the cost lookup unit if needed
            conv_qty, conv_unit = to_base_unit(qty, pkg_unit)
            if conv_unit != ic.unit:
                flags.append(f"unit_mismatch:{pkg_id}:{pkg_unit}!={ic.unit}")
                has_missing = True
                continue
            cost = conv_qty * ic.avg_cost_per_unit
            packaging_cost += cost
            cost_conf_pairs.append((cost, ic.confidence))
            breakdown.append({
                "ingredient": pkg_id,
                "qty": conv_qty,
                "unit": conv_unit,
                "unit_cost": round(ic.avg_cost_per_unit, 4),
                "cost": round(cost, 4),
                "type": "packaging",
            })
        else:
            flags.append(f"missing_data:{pkg_id}")
            has_missing = True

    # Cost-weighted confidence: expensive ingredients matter more than cheap packaging
    if has_missing:
        confidence = 0.0
    elif cost_conf_pairs:
        total_cost_sum = sum(c for c, _ in cost_conf_pairs)
        if total_cost_sum > 0:
            confidence = sum(c * conf / total_cost_sum for c, conf in cost_conf_pairs)
        else:
            confidence = min(conf for _, conf in cost_conf_pairs)
        confidence = min(0.95, confidence)
    else:
        # No ingredient data available — low confidence, not 1.0
        confidence = 0.5

    total_cogs = ingredient_cost + packaging_cost
    margin_eur = sell_price - total_cogs
    margin_pct = (margin_eur / sell_price * 100) if sell_price > 0 else 0.0

    return MenuItemCost(
        menu_item_id=mi["id"],
        name=mi["name"],
        category=mi.get("category", ""),
        sell_price=sell_price,
        ingredient_cost=round(ingredient_cost, 4),
        packaging_cost=round(packaging_cost, 4),
        total_cogs=round(total_cogs, 4),
        margin_percent=round(margin_pct, 1),
        margin_eur=round(margin_eur, 4),
        confidence=round(confidence, 3),
        ingredient_breakdown=breakdown,
        flags=flags,
    )


def _cost_combo(mi: dict[str, Any], item_lookup: dict[str, MenuItemCost]) -> MenuItemCost:
    sell_price = mi["sell_price"]
    combo_ids = mi.get("combo_of", [])
    flags: list[str] = []
    breakdown: list[dict[str, Any]] = []

    total_ingredient = 0.0
    total_packaging = 0.0
    cost_conf_pairs: list[tuple[float, float]] = []
    has_missing = False

    for item_id in combo_ids:
        if item_id not in item_lookup:
            flags.append(f"missing_combo_item:{item_id}")
            has_missing = True
            continue
        sub = item_lookup[item_id]
        total_ingredient += sub.ingredient_cost
        total_packaging += sub.packaging_cost
        sub_cost = sub.ingredient_cost + sub.packaging_cost
        cost_conf_pairs.append((sub_cost, sub.confidence))
        breakdown.append({
            "combo_item": item_id,
            "ingredient_cost": sub.ingredient_cost,
            "packaging_cost": sub.packaging_cost,
        })

    # Cost-weighted confidence (same approach as _cost_menu_item)
    if has_missing:
        confidence = 0.0
    elif cost_conf_pairs:
        total_cost_sum = sum(c for c, _ in cost_conf_pairs)
        if total_cost_sum > 0:
            confidence = sum(c * conf / total_cost_sum for c, conf in cost_conf_pairs)
        else:
            confidence = min(conf for _, conf in cost_conf_pairs)
        confidence = min(0.95, confidence)
    else:
        confidence = 0.5

    total_cogs = total_ingredient + total_packaging
    margin_eur = sell_price - total_cogs
    margin_pct = (margin_eur / sell_price * 100) if sell_price > 0 else 0.0

    return MenuItemCost(
        menu_item_id=mi["id"],
        name=mi["name"],
        category=mi.get("category", "combo"),
        sell_price=sell_price,
        ingredient_cost=round(total_ingredient, 4),
        packaging_cost=round(total_packaging, 4),
        total_cogs=round(total_cogs, 4),
        margin_percent=round(margin_pct, 1),
        margin_eur=round(margin_eur, 4),
        confidence=round(confidence, 3),
        ingredient_breakdown=breakdown,
        flags=flags,
    )


def _recipe_qty_to_base(qty: float, unit: str) -> tuple[float, str]:
    """Convert recipe quantity to base units (g, ml, each) for cost lookup."""
    return to_base_unit(qty, unit)
