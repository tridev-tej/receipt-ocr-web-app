from __future__ import annotations

import asyncio
import json
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile

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
    sys.path.insert(0, str(ROOT))

    try:
        _update_status(run_id, "ocr", 0, total)

        from pipeline.config import RECEIPTS_DIR as _orig
        from pipeline import ocr, validator, normalizer, classifier, mapper, calculator, database, report

        # Stage 1: OCR
        _update_status(run_id, "ocr", 0, total)
        receipts = []
        api_cost = 0.0
        files = sorted(receipt_dir.glob("*"))
        for i, img_path in enumerate(files):
            _update_status(run_id, "ocr", i + 1, total)
            receipt_data = await ocr.extract_receipt(str(img_path), receipt_id=f"U-{i+1:03d}")
            if receipt_data:
                receipts.append(receipt_data)

        if not receipts:
            _update_status(run_id, "error", total, total, "No receipts could be processed")
            return

        # Stage 2: Validate
        _update_status(run_id, "validate", total, total)
        receipts = validator.validate_receipts(receipts)

        # Stage 3: Normalize
        _update_status(run_id, "normalize", total, total)
        items = normalizer.normalize_receipts(receipts)

        # Stage 4: Classify
        _update_status(run_id, "classify", total, total)
        items = classifier.classify_items(items)

        # Stage 5: Map
        _update_status(run_id, "map", total, total)
        try:
            items = await mapper.map_ingredients_async(items)
        except Exception:
            items = mapper.map_ingredients(items)

        # Stage 6: Calculate
        _update_status(run_id, "calculate", total, total)
        ingredient_costs = calculator.calculate_ingredient_costs(items)
        menu_path = ROOT / "menu.json"
        with open(menu_path) as f:
            menu = json.load(f)
        menu_costs = calculator.calculate_menu_costs(ingredient_costs, menu)

        # Stage 7: Database
        _update_status(run_id, "database", total, total)
        run_db = RUNS_DIR / run_id / "cogs.db"
        from pipeline.models import PipelineMetrics
        metrics = PipelineMetrics(
            run_id=run_id,
            receipts_processed=len(receipts),
            receipts_failed=total - len(receipts),
            total_line_items=len(items),
        )
        with database.Database(str(run_db)) as db:
            db.create_tables()
            db.save_pipeline_run(metrics)
            for r in receipts:
                db.save_receipt(r, run_id)
            db.save_line_items(items, run_id)
            db.save_ingredient_costs(ingredient_costs, run_id)
            db.save_menu_item_costs(menu_costs, run_id)

        # Stage 8: Report
        _update_status(run_id, "report", total, total)
        report_path = RUNS_DIR / run_id / "cost_report.md"
        report.write_reports(
            menu_costs, ingredient_costs, items, metrics,
            str(report_path), str(RUNS_DIR / run_id / "cost_report.csv"),
        )

        _update_status(run_id, "complete", total, total)

    except Exception as e:
        _update_status(run_id, "error", 0, total, str(e))


@router.post("")
async def upload_receipts(files: list[UploadFile], background_tasks: BackgroundTasks):
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 20:
        raise HTTPException(400, "Maximum 20 files per upload")

    run_id = uuid.uuid4().hex[:8]
    receipt_dir = RUNS_DIR / run_id / "receipts"
    receipt_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        dest = receipt_dir / f.filename
        content = await f.read()
        dest.write_bytes(content)

    _update_status(run_id, "uploading", 0, len(files))

    background_tasks.add_task(asyncio.get_event_loop().create_task, _run_pipeline(run_id, receipt_dir, len(files)))

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
