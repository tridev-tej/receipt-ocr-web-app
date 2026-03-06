from __future__ import annotations

import asyncio
import json
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from api.schemas import UploadStatusResponse

router = APIRouter(prefix="/api/upload")

ROOT = Path(__file__).resolve().parent.parent.parent
RUNS_DIR = ROOT / "output" / "runs"

_run_status: dict[str, dict] = {}


def _update_status(run_id: str, stage: str, current: int = 0, total: int = 0, error: str | None = None):
    _run_status[run_id] = {
        "run_id": run_id,
        "stage": stage,
        "current_receipt": current,
        "total_receipts": total,
        "error": error,
    }


async def _run_pipeline(run_id: str, receipt_dir: Path, total: int):
    import sys
    import time
    pipeline_dir = str(ROOT / "pipeline")
    if pipeline_dir not in sys.path:
        sys.path.insert(0, pipeline_dir)

    try:
        from ocr import extract_all_receipts
        from validator import validate_receipts
        from normalizer import normalize_receipts
        from classifier import classify_items
        from mapper import map_ingredients, map_ingredients_async
        from calculator import calculate_ingredient_costs, calculate_menu_costs
        from database import Database
        from report import write_reports
        from models import PipelineMetrics

        t0 = time.monotonic()

        # Stage 1: OCR
        _update_status(run_id, "ocr", 0, total)
        receipts, api_cost, ocr_failed = await extract_all_receipts(receipt_dir)
        _update_status(run_id, "ocr", total, total)

        if not receipts:
            _update_status(run_id, "error", total, total, "No receipts could be processed")
            return

        # Stage 2: Validate
        _update_status(run_id, "validate", total, total)
        receipts = validate_receipts(receipts)

        # Stage 3: Normalize
        _update_status(run_id, "normalize", total, total)
        items = normalize_receipts(receipts)

        # Stage 4: Classify
        _update_status(run_id, "classify", total, total)
        items = classify_items(items)

        # Stage 5: Map
        _update_status(run_id, "map", total, total)
        try:
            items = await map_ingredients_async(items)
        except Exception:
            items = map_ingredients(items)

        # Stage 6: Calculate
        _update_status(run_id, "calculate", total, total)
        menu_path = ROOT / "menu.json"
        with open(menu_path) as f:
            menu = json.load(f)
        ingredient_costs = calculate_ingredient_costs(items, menu)
        menu_costs = calculate_menu_costs(ingredient_costs, menu)

        # Compute real metrics
        duration = time.monotonic() - t0
        mapped_count = sum(1 for i in items if i.mapped_ingredient and i.category != "exclude")
        mappable_count = sum(1 for i in items if i.category in ("ingredient", "packaging"))
        mapping_rate = mapped_count / mappable_count if mappable_count > 0 else 0.0
        avg_ocr = sum(r.ocr_confidence for r in receipts) / len(receipts) if receipts else 0.0

        # Stage 7: Database
        _update_status(run_id, "database", total, total)
        run_db = RUNS_DIR / run_id / "cogs.db"
        metrics = PipelineMetrics(
            run_id=run_id,
            receipts_processed=len(receipts),
            receipts_failed=total - len(receipts),
            total_line_items=len(items),
            total_api_cost_usd=api_cost,
            avg_ocr_confidence=round(avg_ocr, 3),
            mapping_rate=round(mapping_rate, 3),
            duration_seconds=round(duration, 2),
        )
        with Database(str(run_db)) as db:
            db.create_tables()
            db.save_pipeline_run(metrics)
            for r in receipts:
                db.save_receipt(r, run_id)
            db.save_line_items(items, run_id)
            db.save_ingredient_costs(ingredient_costs, run_id)
            db.save_menu_item_costs(menu_costs, run_id)

        # Stage 8: Report
        _update_status(run_id, "report", total, total)
        run_dir = RUNS_DIR / run_id
        write_reports(menu_costs, ingredient_costs, items, metrics, str(run_dir))

        _update_status(run_id, "complete", total, total)

    except Exception as e:
        _update_status(run_id, "error", 0, total, str(e))


@router.post("")
async def upload_receipts(files: list[UploadFile]):
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 40:
        raise HTTPException(400, "Maximum 40 files per upload")

    run_id = uuid.uuid4().hex[:8]
    receipt_dir = RUNS_DIR / run_id / "receipts"
    receipt_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        dest = receipt_dir / f.filename
        content = await f.read()
        dest.write_bytes(content)

    _update_status(run_id, "uploading", 0, len(files))

    asyncio.ensure_future(_run_pipeline(run_id, receipt_dir, len(files)))

    return {"run_id": run_id, "total_receipts": len(files)}


@router.get("/status/{run_id}")
def upload_status(run_id: str):
    status = _run_status.get(run_id)
    if not status:
        raise HTTPException(404, "Run not found")
    return UploadStatusResponse(**status)


@router.get("/results/{run_id}")
def upload_results(run_id: str):
    run_dir = RUNS_DIR / run_id
    db_path = run_dir / "cogs.db"
    if not db_path.exists():
        raise HTTPException(404, "Results not ready")

    import sqlite3
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    menu_rows = conn.execute(
        "SELECT * FROM menu_item_costs WHERE run_id = ? ORDER BY margin_percent DESC",
        (run_id,),
    ).fetchall()
    menu_costs = []
    for r in menu_rows:
        d = dict(r)
        d["breakdown"] = json.loads(d["breakdown"]) if d["breakdown"] else []
        menu_costs.append(d)

    ingr_rows = conn.execute(
        "SELECT * FROM ingredient_costs WHERE run_id = ? ORDER BY num_data_points DESC",
        (run_id,),
    ).fetchall()
    ingredients = []
    for r in ingr_rows:
        d = dict(r)
        d["source_receipts"] = json.loads(d["source_receipts"]) if d["source_receipts"] else []
        ingredients.append(d)

    run_row = conn.execute("SELECT * FROM pipeline_runs WHERE run_id = ?", (run_id,)).fetchone()
    metrics = dict(run_row) if run_row else {}
    conn.close()

    report_path = run_dir / "cost_report.md"
    report_md = report_path.read_text() if report_path.exists() else ""

    return {
        "run_id": run_id,
        "menu_costs": menu_costs,
        "ingredients": ingredients,
        "metrics": metrics,
        "report_md": report_md,
    }
