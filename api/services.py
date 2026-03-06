from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "output" / "cogs.db"
EXTRACTIONS_DIR = ROOT / "data" / "extractions"
METRICS_PATH = ROOT / "output" / "pipeline_metrics.json"
EVAL_PATH = ROOT / "output" / "evaluation_results.json"
REPORT_MD_PATH = ROOT / "output" / "cost_report.md"
REPORT_CSV_PATH = ROOT / "output" / "cost_report.csv"
MENU_PATH = ROOT / "menu.json"

RUN_ID = "29f5d2a5"


def _db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_config() -> dict:
    with open(MENU_PATH) as f:
        menu = json.load(f)
    return {
        "menu_items": menu["menu_items"],
        "ingredients": menu["ingredients"],
        "run_id": RUN_ID,
    }


def get_menu_costs() -> list[dict]:
    conn = _db()
    rows = conn.execute(
        """SELECT menu_item_id, name, category, sell_price, ingredient_cost,
                  packaging_cost, total_cogs, margin_percent, margin_eur,
                  confidence, breakdown
           FROM menu_item_costs WHERE run_id = ?
           ORDER BY margin_percent DESC""",
        (RUN_ID,),
    ).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        raw = json.loads(d["breakdown"]) if d["breakdown"] else []
        d["breakdown"] = [
            {
                "ingredient": b.get("ingredient", ""),
                "display_name": b.get("display_name", b.get("ingredient", "")),
                "qty": b.get("qty", 0),
                "unit": b.get("unit", ""),
                "cost_per_unit": b.get("cost_per_unit", b.get("unit_cost", 0)),
                "line_cost": b.get("line_cost", b.get("cost", 0)),
            }
            for b in raw
        ]
        results.append(d)
    return results


def get_ingredients() -> list[dict]:
    conn = _db()
    rows = conn.execute(
        """SELECT ingredient_id, display_name, avg_cost_per_unit, unit,
                  min_cost, max_cost, std_dev, num_data_points, confidence,
                  source_receipts
           FROM ingredient_costs WHERE run_id = ?
           ORDER BY num_data_points DESC""",
        (RUN_ID,),
    ).fetchall()

    results = []
    for r in rows:
        d = dict(r)
        d["source_receipts"] = json.loads(d["source_receipts"]) if d["source_receipts"] else []

        data_points = conn.execute(
            """SELECT receipt_id, raw_description, quantity_normalized,
                      unit_normalized, unit_price_eur, total_eur, mapping_confidence
               FROM line_items
               WHERE mapped_ingredient = ? AND run_id = ? AND category IN ('ingredient', 'packaging')
               ORDER BY receipt_id""",
            (d["ingredient_id"], RUN_ID),
        ).fetchall()
        d["data_points"] = [dict(dp) for dp in data_points]
        results.append(d)

    conn.close()
    return results


def get_metrics() -> dict:
    with open(METRICS_PATH) as f:
        return json.load(f)


def get_evaluation() -> dict:
    with open(EVAL_PATH) as f:
        return json.load(f)


def _to_db_receipt_id(extraction_id: str) -> str:
    """Convert R-001 (extraction filename) to R-000001 (DB receipt_id)."""
    parts = extraction_id.split("-")
    if len(parts) == 2 and parts[1].isdigit():
        return f"R-{int(parts[1]):06d}"
    return extraction_id


def get_receipt_walkthrough(receipt_id: str) -> dict | None:
    extraction_file = EXTRACTIONS_DIR / f"{receipt_id}.json"
    if not extraction_file.exists():
        return None

    with open(extraction_file) as f:
        raw = json.load(f)

    db_id = _to_db_receipt_id(receipt_id)
    conn = _db()
    receipt_row = conn.execute(
        "SELECT * FROM receipts WHERE id = ? AND run_id = ?",
        (db_id, RUN_ID),
    ).fetchone()

    line_items = conn.execute(
        """SELECT id, raw_description, mapped_ingredient, mapping_method,
                  mapping_confidence, category, quantity, unit_raw,
                  unit_normalized, quantity_normalized, unit_price_eur,
                  total_eur, flagged, flag_reasons
           FROM line_items
           WHERE receipt_id = ? AND run_id = ?
           ORDER BY id""",
        (db_id, RUN_ID),
    ).fetchall()
    conn.close()

    return {
        "receipt_id": receipt_id,
        "supplier": raw.get("supplier", ""),
        "date": raw.get("date"),
        "currency": raw.get("currency", "EUR"),
        "raw_extraction": raw,
        "line_items": [
            {**dict(li), "flag_reasons": json.loads(li["flag_reasons"]) if li["flag_reasons"] else []}
            for li in line_items
        ],
    }


def get_report() -> dict:
    md = REPORT_MD_PATH.read_text() if REPORT_MD_PATH.exists() else ""
    csv = REPORT_CSV_PATH.read_text() if REPORT_CSV_PATH.exists() else ""
    return {"markdown": md, "csv": csv}


def get_flagged() -> list[dict]:
    conn = _db()
    rows = conn.execute(
        """SELECT id, receipt_id, raw_description, mapped_ingredient,
                  mapping_method, mapping_confidence, category,
                  quantity, total_eur, flag_reasons
           FROM line_items
           WHERE flagged = 1 AND run_id = ?
           ORDER BY id""",
        (RUN_ID,),
    ).fetchall()
    conn.close()
    return [
        {**dict(r), "flag_reasons": json.loads(r["flag_reasons"]) if r["flag_reasons"] else []}
        for r in rows
    ]


def get_receipt_ids() -> list[str]:
    files = sorted(EXTRACTIONS_DIR.glob("R-*.json"))
    return [f.stem for f in files]
