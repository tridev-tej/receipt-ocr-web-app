from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from config import DB_PATH
from src.models import (
    IngredientCost,
    MenuItemCost,
    NormalizedLineItem,
    PipelineMetrics,
    RawReceipt,
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    receipts_processed INTEGER DEFAULT 0,
    receipts_failed INTEGER DEFAULT 0,
    total_line_items INTEGER DEFAULT 0,
    total_api_cost_usd REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT NOT NULL,
    run_id TEXT NOT NULL REFERENCES pipeline_runs(run_id),
    supplier_id TEXT REFERENCES suppliers(id),
    date TEXT,
    currency TEXT DEFAULT 'EUR',
    language TEXT DEFAULT 'en',
    image_path TEXT,
    ocr_method TEXT,
    ocr_confidence REAL CHECK(ocr_confidence IS NULL OR ocr_confidence >= 0),
    receipt_total REAL,
    is_duplicate INTEGER DEFAULT 0 CHECK(is_duplicate IN (0, 1)),
    PRIMARY KEY (run_id, id)
);

CREATE TABLE IF NOT EXISTS line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    raw_description TEXT,
    mapped_ingredient TEXT,
    mapping_method TEXT,
    mapping_confidence REAL CHECK(mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)),
    category TEXT,
    quantity REAL,
    unit_raw TEXT,
    unit_normalized TEXT,
    quantity_normalized REAL,
    unit_price_eur REAL CHECK(unit_price_eur IS NULL OR unit_price_eur >= 0 OR is_discount = 1),
    total_eur REAL,
    is_tax_or_fee INTEGER DEFAULT 0 CHECK(is_tax_or_fee IN (0, 1)),
    is_refund INTEGER DEFAULT 0 CHECK(is_refund IN (0, 1)),
    is_discount INTEGER DEFAULT 0 CHECK(is_discount IN (0, 1)),
    flagged INTEGER DEFAULT 0 CHECK(flagged IN (0, 1)),
    flag_reasons TEXT,
    FOREIGN KEY (run_id, receipt_id) REFERENCES receipts(run_id, id)
);

CREATE TABLE IF NOT EXISTS ingredient_costs (
    ingredient_id TEXT NOT NULL,
    run_id TEXT NOT NULL REFERENCES pipeline_runs(run_id),
    display_name TEXT,
    avg_cost_per_unit REAL,
    unit TEXT,
    min_cost REAL,
    max_cost REAL,
    std_dev REAL,
    num_data_points INTEGER,
    confidence REAL CHECK(confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    source_receipts TEXT,
    PRIMARY KEY (run_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS menu_item_costs (
    menu_item_id TEXT NOT NULL,
    run_id TEXT NOT NULL REFERENCES pipeline_runs(run_id),
    name TEXT,
    category TEXT,
    sell_price REAL,
    ingredient_cost REAL,
    packaging_cost REAL,
    total_cogs REAL,
    margin_percent REAL,
    margin_eur REAL,
    confidence REAL CHECK(confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    breakdown TEXT,
    PRIMARY KEY (run_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_line_items_ingredient ON line_items(mapped_ingredient);
CREATE INDEX IF NOT EXISTS idx_line_items_ingredient_run ON line_items(mapped_ingredient, run_id);
CREATE INDEX IF NOT EXISTS idx_line_items_receipt ON line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_run ON line_items(run_id);
CREATE INDEX IF NOT EXISTS idx_line_items_run_receipt ON line_items(run_id, receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipts_run ON receipts(run_id);
CREATE INDEX IF NOT EXISTS idx_li_ingr_run_cat
    ON line_items(mapped_ingredient, run_id, category, receipt_id);
"""


def _slugify(name: str) -> str:
    """Deterministic slug with hash suffix to prevent collisions.

    Base slug is human-readable; 8-char hash of the original (case-preserved,
    stripped) name guarantees distinct suppliers like 'Café A' vs 'Cafe A'
    get distinct IDs.
    """
    import hashlib

    base = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    h = hashlib.sha256(name.strip().encode()).hexdigest()[:8]
    return f"{base}_{h}" if base else h


class Database:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path or DB_PATH)
        self._conn: Optional[sqlite3.Connection] = None

    def __enter__(self) -> Database:
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._conn.execute("PRAGMA busy_timeout=5000")
        return self

    def __exit__(self, exc_type: type | None, exc_val: Exception | None, exc_tb: object) -> None:
        if self._conn:
            conn = self._conn
            try:
                if exc_type is None:
                    conn.commit()
                else:
                    conn.rollback()
            finally:
                conn.close()
                self._conn = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            raise RuntimeError("Database not opened. Use 'with Database() as db:'")
        return self._conn

    def create_tables(self) -> None:
        self.conn.executescript(SCHEMA)
        self.conn.execute("PRAGMA user_version = 1")

    def save_pipeline_run(self, run: PipelineMetrics) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            """INSERT INTO pipeline_runs
               (run_id, started_at, completed_at, receipts_processed, receipts_failed,
                total_line_items, total_api_cost_usd)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(run_id) DO UPDATE SET
                   completed_at = excluded.completed_at,
                   receipts_processed = excluded.receipts_processed,
                   receipts_failed = excluded.receipts_failed,
                   total_line_items = excluded.total_line_items,
                   total_api_cost_usd = excluded.total_api_cost_usd""",
            (
                run.run_id,
                now,
                now,
                run.receipts_processed,
                run.receipts_failed,
                run.total_line_items,
                run.total_api_cost_usd,
            ),
        )

    def cleanup_run(self, run_id: str) -> None:
        """Delete all data for a run_id to ensure idempotent re-runs."""
        self.conn.execute("DELETE FROM menu_item_costs WHERE run_id = ?", (run_id,))
        self.conn.execute("DELETE FROM ingredient_costs WHERE run_id = ?", (run_id,))
        self.conn.execute("DELETE FROM line_items WHERE run_id = ?", (run_id,))
        self.conn.execute("DELETE FROM receipts WHERE run_id = ?", (run_id,))

    def save_receipt(self, receipt: RawReceipt, run_id: str) -> None:
        supplier_id = _slugify(receipt.supplier)
        self.conn.execute(
            "INSERT OR IGNORE INTO suppliers (id, name) VALUES (?, ?)",
            (supplier_id, receipt.supplier),
        )
        self.conn.execute(
            """INSERT INTO receipts
               (id, run_id, supplier_id, date, currency, language, image_path,
                ocr_method, ocr_confidence, receipt_total, is_duplicate)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(run_id, id) DO UPDATE SET
                   supplier_id = excluded.supplier_id,
                   date = excluded.date,
                   currency = excluded.currency,
                   language = excluded.language,
                   image_path = excluded.image_path,
                   ocr_method = excluded.ocr_method,
                   ocr_confidence = excluded.ocr_confidence,
                   receipt_total = excluded.receipt_total,
                   is_duplicate = excluded.is_duplicate""",
            (
                receipt.receipt_id,
                run_id,
                supplier_id,
                receipt.date,
                receipt.currency,
                receipt.language,
                receipt.image_path,
                receipt.ocr_method,
                receipt.ocr_confidence,
                receipt.total,
                int(receipt.is_duplicate),
            ),
        )

    def save_line_items(self, items: list[NormalizedLineItem], run_id: str) -> None:
        """Save normalized line items. Caller must ensure save_receipt() was called first
        for every distinct receipt_id in `items`, otherwise the FK constraint will fail."""
        # Delete existing items for this run to ensure idempotency on re-run
        self.conn.execute("DELETE FROM line_items WHERE run_id = ?", (run_id,))
        rows = [
            (
                item.receipt_id,
                run_id,
                item.raw_description,
                item.mapped_ingredient,
                item.mapping_method,
                item.mapping_confidence,
                item.category,
                item.raw_quantity,
                item.raw_unit,
                item.unit_normalized,
                item.quantity_normalized,
                item.unit_price_eur,
                item.total_eur,
                int(item.is_tax_or_fee),
                int(item.is_refund),
                1 if item.total_eur < 0 else 0,  # is_discount heuristic
                int(item.flagged),
                json.dumps(item.flag_reasons) if item.flag_reasons else None,
            )
            for item in items
        ]
        self.conn.executemany(
            """INSERT INTO line_items
               (receipt_id, run_id, raw_description, mapped_ingredient, mapping_method,
                mapping_confidence, category, quantity, unit_raw, unit_normalized,
                quantity_normalized, unit_price_eur, total_eur, is_tax_or_fee,
                is_refund, is_discount, flagged, flag_reasons)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )

    def save_ingredient_costs(self, costs: list[IngredientCost], run_id: str) -> None:
        rows = [
            (
                run_id,
                c.ingredient_id,
                c.display_name,
                c.avg_cost_per_unit,
                c.unit,
                c.min_cost,
                c.max_cost,
                c.std_dev,
                c.num_data_points,
                c.confidence,
                json.dumps(c.source_receipts),
            )
            for c in costs
        ]
        self.conn.executemany(
            """INSERT INTO ingredient_costs
               (run_id, ingredient_id, display_name, avg_cost_per_unit, unit,
                min_cost, max_cost, std_dev, num_data_points, confidence, source_receipts)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(run_id, ingredient_id) DO UPDATE SET
                   display_name = excluded.display_name,
                   avg_cost_per_unit = excluded.avg_cost_per_unit,
                   unit = excluded.unit, min_cost = excluded.min_cost,
                   max_cost = excluded.max_cost, std_dev = excluded.std_dev,
                   num_data_points = excluded.num_data_points,
                   confidence = excluded.confidence,
                   source_receipts = excluded.source_receipts""",
            rows,
        )

    def save_menu_item_costs(self, costs: list[MenuItemCost], run_id: str) -> None:
        rows = [
            (
                run_id,
                c.menu_item_id,
                c.name,
                c.category,
                c.sell_price,
                c.ingredient_cost,
                c.packaging_cost,
                c.total_cogs,
                c.margin_percent,
                c.margin_eur,
                c.confidence,
                json.dumps(c.ingredient_breakdown),
            )
            for c in costs
        ]
        self.conn.executemany(
            """INSERT INTO menu_item_costs
               (run_id, menu_item_id, name, category, sell_price, ingredient_cost,
                packaging_cost, total_cogs, margin_percent, margin_eur, confidence, breakdown)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(run_id, menu_item_id) DO UPDATE SET
                   name = excluded.name, category = excluded.category,
                   sell_price = excluded.sell_price,
                   ingredient_cost = excluded.ingredient_cost,
                   packaging_cost = excluded.packaging_cost,
                   total_cogs = excluded.total_cogs,
                   margin_percent = excluded.margin_percent,
                   margin_eur = excluded.margin_eur,
                   confidence = excluded.confidence,
                   breakdown = excluded.breakdown""",
            rows,
        )

    def get_line_items_for_ingredient(
        self, ingredient_id: str, run_id: str
    ) -> list[dict[str, object]]:
        cursor = self.conn.execute(
            """SELECT receipt_id, raw_description, quantity_normalized, unit_normalized,
                      unit_price_eur, total_eur, mapping_confidence
               FROM line_items
               WHERE mapped_ingredient = ? AND run_id = ? AND category = 'ingredient'
               ORDER BY receipt_id""",
            (ingredient_id, run_id),
        )
        return [dict(row) for row in cursor.fetchall()]
